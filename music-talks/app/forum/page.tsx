"use client";

import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserTimezone } from "../hooks/useUserTimezone";
import {
  formatArchiveDate,
  formatTimestampDisplay,
} from "../utils/datetime";
import ForumCommentThread from "./ForumCommentThread";
import { isDeletedUserLabel } from "../constants/deletedUser";
import {
  type ForumMode,
  type CommunityFilter,
  type User,
  type Topic,
  type Comment,
  type Pagination,
  FORUM_TABS,
  isEdited,
  buildForumTopicUrl,
  groupTopicsByDate,
  countVisibleComments,
  topicMatchesForumMode,
  forumModeFromSearchParams,
} from "./forumTypes";

function ForumPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-gray-600">Loading...</p>
    </div>
  );
}

export default function ForumPage() {
  return (
    <Suspense fallback={<ForumPageFallback />}>
      <ForumPageContent />
    </Suspense>
  );
}

function ForumPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [user, setUser] = useState<User | null>(null);
  const [forumMode, setForumMode] = useState<ForumMode>("discussion");
  const [communityFilter, setCommunityFilter] =
    useState<CommunityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [linkedTopic, setLinkedTopic] = useState<Topic | null>(null);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [commentPage, setCommentPage] = useState(1);
  const [commentPagination, setCommentPagination] = useState<Pagination | null>(
    null
  );
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicPage, setTopicPage] = useState(1);
  const [topicPagination, setTopicPagination] = useState<Pagination | null>(
    null
  );
  const [loadingMoreTopics, setLoadingMoreTopics] = useState(false);
  const [latestDiscussion, setLatestDiscussion] = useState<Topic | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [creatingPost, setCreatingPost] = useState(false);
  const [liking, setLiking] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [savingCommentId, setSavingCommentId] = useState<string | null>(null);
  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingPost, setSavingPost] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [urlInitialized, setUrlInitialized] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const { timezone: displayTimezone } = useUserTimezone();
  const isAuthenticated = user !== null;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    const token = localStorage.getItem("token");
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const updateUrl = useCallback(
    (
      mode: ForumMode,
      topicId: string | null,
      filter: CommunityFilter,
      search?: string
    ) => {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (topicId) params.set("topic", topicId);
      if (mode === "community" && filter === "mine") {
        params.set("filter", "mine");
      }
      if (search?.trim()) params.set("search", search.trim());
      router.replace(`/forum?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  useEffect(() => {
    if (urlInitialized) return;

    const modeParam = searchParams.get("mode");
    const topicParam = searchParams.get("topic");
    const filterParam = searchParams.get("filter");
    const searchParam = searchParams.get("search");

    if (modeParam === "community" || modeParam === "discussion") {
      setForumMode(modeParam);
    }
    if (filterParam === "mine") {
      setCommunityFilter("mine");
    }
    if (searchParam) {
      setSearchQuery(searchParam);
      setDebouncedSearch(searchParam);
    }
    if (topicParam) {
      setSelectedTopicId(topicParam);
    }

    setUrlInitialized(true);
  }, [searchParams, urlInitialized]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setTopicPage(1);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const fetchTopics = useCallback(
    async (
      mode: ForumMode,
      filter: CommunityFilter,
      page: number,
      search: string,
      append: boolean
    ) => {
      const searchParam = search.trim()
        ? `&search=${encodeURIComponent(search.trim())}`
        : "";

      const url =
        mode === "community" && filter === "mine"
          ? `${backendUrl}/api/forum/topics/mine?page=${page}${searchParam}`
          : `${backendUrl}/api/forum/topics?type=${
              mode === "discussion" ? "daily_discussion" : "community_post"
            }&page=${page}${searchParam}`;

      const response = await fetch(url, { headers: authHeaders() });
      if (!response.ok) {
        if (!append) setTopics([]);
        return null;
      }

      const data = await response.json();
      const fetched: Topic[] = data.topics || [];
      setTopics((prev) => (append ? [...prev, ...fetched] : fetched));
      setTopicPagination(data.pagination ?? null);
      return fetched;
    },
    [backendUrl, authHeaders]
  );

  const fetchTopicById = useCallback(
    async (topicId: string): Promise<Topic | null> => {
      try {
        const response = await fetch(
          `${backendUrl}/api/forum/topics/${topicId}`,
          { headers: authHeaders() }
        );
        if (!response.ok) {
          return null;
        }
        const data = await response.json();
        return (data.topic as Topic | null) ?? null;
      } catch {
        return null;
      }
    },
    [backendUrl, authHeaders]
  );

  const fetchLatestDiscussion = useCallback(async () => {
    try {
      const response = await fetch(`${backendUrl}/api/forum/topic/latest`);
      if (!response.ok) {
        setLatestDiscussion(null);
        return;
      }
      const data = await response.json();
      setLatestDiscussion(data.topic || null);
    } catch {
      setLatestDiscussion(null);
    }
  }, [backendUrl]);

  const fetchComments = useCallback(
    async (topicId: string, page: number, append: boolean) => {
      try {
        const response = await fetch(
          `${backendUrl}/api/forum/comments?topicId=${topicId}&page=${page}`,
          { headers: authHeaders() }
        );
        if (!response.ok) throw new Error("Failed to fetch comments");
        const data = await response.json();
        const fetched: Comment[] = data.comments || [];
        setComments((prev) => (append ? [...prev, ...fetched] : fetched));
        setCommentPagination(data.pagination ?? null);
        setTotalComments(data.totalComments ?? countVisibleComments(fetched));
        setCommentPage(page);
      } catch {
        if (!append) {
          setComments([]);
          setCommentPagination(null);
          setTotalComments(0);
        }
      }
    },
    [backendUrl, authHeaders]
  );

  useEffect(() => {
    if (!urlInitialized) return;

    const init = async () => {
      setLoading(true);
      await fetchLatestDiscussion();
      await fetchTopics(forumMode, communityFilter, 1, debouncedSearch, false);
      setTopicPage(1);
      setLoading(false);
    };
    init();
  }, [urlInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!urlInitialized) return;
    if (communityFilter === "mine" && !isAuthenticated) {
      setCommunityFilter("all");
      return;
    }

    setTopicPage(1);
    fetchTopics(forumMode, communityFilter, 1, debouncedSearch, false);
    setShowCreateForm(false);
    setEditingPost(false);
  }, [forumMode, communityFilter, debouncedSearch, isAuthenticated, urlInitialized, fetchTopics]);

  const isMyPostsView =
    forumMode === "community" && communityFilter === "mine";

  const topicFromList = selectedTopicId
    ? topics.find((t) => t.id === selectedTopicId) ?? null
    : null;

  const topicFromListForMode =
    topicFromList && topicMatchesForumMode(topicFromList, forumMode)
      ? topicFromList
      : null;

  const linkedTopicForMode =
    linkedTopic &&
    linkedTopic.id === selectedTopicId &&
    topicMatchesForumMode(linkedTopic, forumMode)
      ? linkedTopic
      : null;

  const displayedTopic = (() => {
    if (forumMode === "discussion") {
      return (
        topicFromListForMode ||
        linkedTopicForMode ||
        (!selectedTopicId ? latestDiscussion : null)
      );
    }

    if (isMyPostsView) {
      if (selectedTopicId) {
        return topicFromList ?? null;
      }
      return topics[0] ?? null;
    }

    return (
      topicFromListForMode ||
      linkedTopicForMode ||
      (!selectedTopicId ? topics[0] ?? null : null)
    );
  })();

  const displayedTopicTimestamp = useMemo(() => {
    if (!displayedTopic) return null;
    return formatTimestampDisplay(
      displayedTopic.createdAt,
      displayTimezone
    );
  }, [displayedTopic, displayTimezone]);

  useEffect(() => {
    if (!urlInitialized || !selectedTopicId) return;
    if (isMyPostsView) return;
    if (forumModeFromSearchParams(searchParams) !== forumMode) return;
    if (topicFromListForMode || linkedTopicForMode) return;

    let cancelled = false;

    const loadLinkedTopic = async () => {
      const topic = await fetchTopicById(selectedTopicId);
      if (cancelled || !topic || topic.id !== selectedTopicId) return;
      if (!topicMatchesForumMode(topic, forumMode)) return;
      setLinkedTopic(topic);
    };

    loadLinkedTopic();
    return () => {
      cancelled = true;
    };
  }, [
    selectedTopicId,
    urlInitialized,
    topicFromListForMode,
    linkedTopicForMode,
    fetchTopicById,
    isMyPostsView,
    forumMode,
    searchParams,
  ]);

  /** My Posts must not show a topic from All Posts / permalink cache */
  useEffect(() => {
    if (!isMyPostsView) return;
    if (!selectedTopicId) {
      setLinkedTopic(null);
      return;
    }
    if (topicFromList) return;

    setSelectedTopicId(null);
    setLinkedTopic(null);
    if (searchParams.get("topic")) {
      updateUrl(forumMode, null, "mine", debouncedSearch);
    }
  }, [
    isMyPostsView,
    selectedTopicId,
    topicFromList,
    forumMode,
    debouncedSearch,
    searchParams,
    updateUrl,
  ]);

  /** Permalink without mode: infer tab from loaded topic type (initial deep link only). */
  useEffect(() => {
    if (!urlInitialized || !linkedTopic || !selectedTopicId) return;
    if (linkedTopic.id !== selectedTopicId) return;
    if (searchParams.get("mode")) return;

    const inferred: ForumMode =
      linkedTopic.type === "daily_discussion" ? "discussion" : "community";
    if (forumMode === inferred) return;

    setForumMode(inferred);
    updateUrl(inferred, selectedTopicId, communityFilter, debouncedSearch);
  }, [
    linkedTopic,
    selectedTopicId,
    urlInitialized,
    searchParams,
    forumMode,
    communityFilter,
    debouncedSearch,
    updateUrl,
  ]);

  useEffect(() => {
    if (displayedTopic?.id) {
      setCommentPage(1);
      fetchComments(displayedTopic.id, 1, false);
    } else {
      setComments([]);
      setCommentPagination(null);
      setTotalComments(0);
    }
    setEditingCommentId(null);
    setEditCommentText("");
    setReplyingToCommentId(null);
    setReplyText("");
  }, [displayedTopic?.id, fetchComments]);

  useEffect(() => {
    if (!urlInitialized || !displayedTopic?.id) return;
    if (isMyPostsView && !topics.some((t) => t.id === displayedTopic.id)) return;
    if (searchParams.get("topic") === displayedTopic.id) return;
    updateUrl(forumMode, displayedTopic.id, communityFilter, debouncedSearch);
  }, [displayedTopic?.id, urlInitialized, isMyPostsView, topics]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!urlInitialized || loading) return;
    if (forumModeFromSearchParams(searchParams) !== forumMode) return;

    const topicParam = searchParams.get("topic");
    if (!topicParam || topicParam === selectedTopicId) return;

    if (communityFilter === "mine") {
      if (topics.some((t) => t.id === topicParam)) {
        setSelectedTopicId(topicParam);
      }
      return;
    }

    setSelectedTopicId(topicParam);
  }, [
    searchParams,
    urlInitialized,
    loading,
    selectedTopicId,
    communityFilter,
    topics,
    forumMode,
  ]);

  const pastDiscussionTopics =
    forumMode === "discussion"
      ? topics.filter((t) => t.id !== latestDiscussion?.id)
      : [];

  const pastDiscussionGroups = groupTopicsByDate(pastDiscussionTopics);
  const communityTopics = forumMode === "community" ? topics : [];

  const showTodayDiscussion =
    forumMode === "discussion" &&
    latestDiscussion &&
    (!debouncedSearch.trim() ||
      latestDiscussion.title
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()) ||
      latestDiscussion.content
        .toLowerCase()
        .includes(debouncedSearch.toLowerCase()));

  const isTodayDiscussionSelected =
    forumMode === "discussion" &&
    (selectedTopicId === null ||
      selectedTopicId === latestDiscussion?.id);

  const isCommunityView = forumMode === "community";

  const isOwnPost =
    !!user &&
    !!displayedTopic?.userId &&
    displayedTopic.userId === user.id;

  const isTodayDiscussion =
    forumMode === "discussion" && isTodayDiscussionSelected;

  const selectTopic = (topicId: string | null) => {
    setSelectedTopicId(topicId);
    setEditingPost(false);
    updateUrl(forumMode, topicId, communityFilter, debouncedSearch);
  };

  const handleModeChange = (mode: ForumMode) => {
    const filter: CommunityFilter = mode === "discussion" ? "all" : communityFilter;
    setForumMode(mode);
    if (mode === "discussion") {
      setCommunityFilter("all");
    }
    setSelectedTopicId(null);
    setLinkedTopic(null);
    updateUrl(mode, null, filter, debouncedSearch);
    setError(null);
  };

  const handleCommunityFilterChange = (filter: CommunityFilter) => {
    setCommunityFilter(filter);
    setSelectedTopicId(null);
    setLinkedTopic(null);
    updateUrl(forumMode, null, filter, debouncedSearch);
    setError(null);
  };

  const handleLoadMoreTopics = async () => {
    if (!topicPagination?.hasMore || loadingMoreTopics) return;
    setLoadingMoreTopics(true);
    const nextPage = topicPage + 1;
    await fetchTopics(
      forumMode,
      communityFilter,
      nextPage,
      debouncedSearch,
      true
    );
    setTopicPage(nextPage);
    setLoadingMoreTopics(false);
  };

  const handleLoadMoreComments = async () => {
    if (!displayedTopic?.id || !commentPagination?.hasMore || loadingMoreComments)
      return;
    setLoadingMoreComments(true);
    const nextPage = commentPage + 1;
    await fetchComments(displayedTopic.id, nextPage, true);
    setLoadingMoreComments(false);
  };

  const handleShareLink = async () => {
    if (!displayedTopic) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}${buildForumTopicUrl(
            displayedTopic.id,
            forumMode,
            communityFilter
          )}`
        : buildForumTopicUrl(displayedTopic.id, forumMode, communityFilter);

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  };

  const refreshComments = async () => {
    if (!displayedTopic?.id) return;
    await fetchComments(displayedTopic.id, 1, false);
    setCommentPage(1);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated || !user || !displayedTopic) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/forum/comments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          topicId: displayedTopic.id,
          text: newComment.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to post comment");

      setNewComment("");
      await refreshComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (
    e: React.FormEvent,
    parentId: string
  ) => {
    e.preventDefault();
    if (!replyText.trim() || !isAuthenticated || !displayedTopic) return;

    setSubmittingReply(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/forum/comments`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          topicId: displayedTopic.id,
          text: replyText.trim(),
          parentId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to post reply");

      setReplyText("");
      setReplyingToCommentId(null);
      await refreshComments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || !newPostContent.trim() || !user) return;

    setCreatingPost(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/forum/topics`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create post");

      setNewPostTitle("");
      setNewPostContent("");
      setShowCreateForm(false);
      setForumMode("community");
      setCommunityFilter("all");
      await fetchTopics("community", "all", 1, debouncedSearch, false);
      if (data.topic?.id) selectTopic(data.topic.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setCreatingPost(false);
    }
  };

  const startEditingPost = () => {
    if (!displayedTopic) return;
    setEditTitle(displayedTopic.title);
    setEditContent(displayedTopic.content);
    setEditingPost(true);
    setError(null);
  };

  const cancelEditingPost = () => {
    setEditingPost(false);
    setEditTitle("");
    setEditContent("");
  };

  const handleUpdatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayedTopic || !user || !isMyPostsView) return;

    setSavingPost(true);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/topics/${displayedTopic.id}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({
            title: editTitle.trim(),
            content: editContent.trim(),
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update post");

      setEditingPost(false);
      await fetchTopics("community", "mine", 1, debouncedSearch, false);
      setLinkedTopic(data.topic);
      selectTopic(data.topic.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update post");
    } finally {
      setSavingPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!displayedTopic || !user || !isMyPostsView) return;
    if (!window.confirm("Delete this post? This cannot be undone.")) return;

    setDeletingPost(true);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/topics/${displayedTopic.id}`,
        { method: "DELETE", headers: authHeaders() }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete post");

      setEditingPost(false);
      setSelectedTopicId(null);
      setLinkedTopic(null);
      await fetchTopics("community", "mine", 1, debouncedSearch, false);
      updateUrl("community", null, "mine", debouncedSearch);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingPost(false);
    }
  };

  const handleToggleLike = async () => {
    if (!displayedTopic || !isCommunityView || isMyPostsView || isOwnPost) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Log in to like posts");
      return;
    }

    setLiking(true);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/topics/${displayedTopic.id}/like`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to toggle like");

      const patch = {
        likeCount: data.likeCount as number,
        likedByUser: data.likedByUser as boolean,
      };
      setTopics((prev) =>
        prev.map((t) => (t.id === displayedTopic.id ? { ...t, ...patch } : t))
      );
      setLinkedTopic((prev) =>
        prev?.id === displayedTopic.id ? { ...prev, ...patch } : prev
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle like");
    } finally {
      setLiking(false);
    }
  };

  const updateCommentInTree = (
    list: Comment[],
    commentId: string,
    updater: (c: Comment) => Comment
  ): Comment[] =>
    list.map((c) => {
      if (c.id === commentId) return updater(c);
      if (c.replies?.length) {
        return {
          ...c,
          replies: updateCommentInTree(c.replies, commentId, updater),
        };
      }
      return c;
    });

  const handleToggleCommentLike = async (commentId: string) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Log in to like comments");
      return;
    }

    setLikingCommentId(commentId);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/comments/${commentId}/like`,
        { method: "POST", headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to toggle like");

      setComments((prev) =>
        updateCommentInTree(prev, commentId, (c) => ({
          ...c,
          likeCount: data.likeCount,
          likedByUser: data.likedByUser,
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to toggle like");
    } finally {
      setLikingCommentId(null);
    }
  };

  const startEditingComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditCommentText(comment.text);
    setReplyingToCommentId(null);
    setError(null);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditCommentText("");
  };

  const handleUpdateComment = async (
    e: React.FormEvent,
    commentId: string
  ) => {
    e.preventDefault();
    if (!editCommentText.trim()) return;

    setSavingCommentId(commentId);
    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/comments/${commentId}`,
        {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ text: editCommentText.trim() }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update comment");

      setComments((prev) =>
        updateCommentInTree(prev, commentId, () => data.comment)
      );
      cancelEditingComment();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update comment");
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Delete this comment? Replies will also be removed."))
      return;

    setError(null);

    try {
      const response = await fetch(
        `${backendUrl}/api/forum/comments/${commentId}`,
        { method: "DELETE", headers: authHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to delete comment");

      await refreshComments();
      if (editingCommentId === commentId) cancelEditingComment();
      if (replyingToCommentId === commentId) {
        setReplyingToCommentId(null);
        setReplyText("");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete comment");
    }
  };

  if (loading) {
    return <ForumPageFallback />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-72 min-h-screen bg-white shadow-sm border-r border-gray-200 p-6 overflow-y-auto">
        <div className="grid grid-cols-2 gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
          {FORUM_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleModeChange(tab.id)}
              className={`py-2.5 px-2 rounded-md text-sm font-medium transition-colors ${
                forumMode === tab.id
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {forumMode === "community" && isAuthenticated && (
          <div className="grid grid-cols-2 gap-1 mb-6 p-1 bg-purple-50 rounded-lg border border-purple-100">
            <button
              onClick={() => handleCommunityFilterChange("all")}
              className={`py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                communityFilter === "all"
                  ? "bg-white text-purple-900 shadow-sm"
                  : "text-purple-700 hover:text-purple-900"
              }`}
            >
              All Posts
            </button>
            <button
              onClick={() => handleCommunityFilterChange("mine")}
              className={`py-2 px-2 rounded-md text-xs font-medium transition-colors ${
                communityFilter === "mine"
                  ? "bg-white text-purple-900 shadow-sm"
                  : "text-purple-700 hover:text-purple-900"
              }`}
            >
              My Posts
            </button>
          </div>
        )}

        <div className="relative mb-6">
          <input
            type="text"
            placeholder={
              forumMode === "discussion"
                ? "Search title or content..."
                : isMyPostsView
                  ? "Search your posts..."
                  : "Search title or content..."
            }
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {forumMode === "discussion" ? (
          <>
            {showTodayDiscussion && (
              <div className="mb-5 pb-4 border-b-2 border-gray-200">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Today
                </h3>
                <div
                  className={`flex items-start p-3 rounded-lg cursor-pointer transition-all border-2 ${
                    isTodayDiscussionSelected
                      ? "bg-blue-50 border-blue-500"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                  onClick={() => selectTopic(latestDiscussion!.id)}
                >
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-3 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block font-semibold text-gray-900 truncate">
                      {latestDiscussion!.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 block">
                      Today&apos;s discussion
                    </span>
                  </div>
                </div>
              </div>
            )}

            {pastDiscussionGroups.length > 0 ? (
              <div>
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Past Discussions
                </h3>
                <div className="flex flex-col gap-4">
                  {pastDiscussionGroups.map(([date, dateTopics]) => (
                    <div key={date}>
                      <h4 className="text-xs font-semibold text-gray-500 mb-2 px-1">
                        {formatArchiveDate(date, displayTimezone)}
                      </h4>
                      <div className="flex flex-col gap-1.5">
                        {dateTopics.map((topic) => (
                          <div
                            key={topic.id}
                            className={`flex items-start p-3 rounded-lg cursor-pointer transition-all border ${
                              selectedTopicId === topic.id
                                ? "bg-blue-50 border-blue-500"
                                : "border-transparent hover:bg-gray-50"
                            }`}
                            onClick={() => selectTopic(topic.id)}
                          >
                            <div className="w-3 h-3 rounded-full bg-blue-500 mr-3 mt-1 flex-shrink-0" />
                            <span className="text-sm block truncate text-gray-900">
                              {topic.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              !showTodayDiscussion && (
                <p className="text-sm text-gray-500 py-4 text-center">
                  No discussion topics found
                </p>
              )
            )}
          </>
        ) : communityTopics.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                {isMyPostsView ? "Your Posts" : "Community Posts"}
              </h3>
              {!isMyPostsView && (
                <span className="text-xs text-gray-400">Newest first</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {communityTopics.map((topic) => (
                <div
                  key={topic.id}
                  className={`flex items-start p-3 rounded-lg cursor-pointer transition-all border ${
                    selectedTopicId === topic.id
                      ? "bg-purple-50 border-purple-500"
                      : "border-transparent hover:bg-gray-50"
                  }`}
                  onClick={() => selectTopic(topic.id)}
                >
                  <div className="w-3 h-3 rounded-full bg-purple-500 mr-3 mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block truncate text-gray-900">
                      {topic.title}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 block truncate">
                      {!isMyPostsView && topic.authorUsername
                        ? `${topic.authorUsername} · `
                        : ""}
                      {formatArchiveDate(topic.date, displayTimezone)}
                      {!isMyPostsView ? ` · ${topic.likeCount ?? 0} likes` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            {isMyPostsView
              ? "You haven't posted anything yet"
              : debouncedSearch.trim()
                ? "No posts match your search"
                : "No community posts yet"}
          </p>
        )}

        {topicPagination?.hasMore && (
          <button
            type="button"
            onClick={handleLoadMoreTopics}
            disabled={loadingMoreTopics}
            className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            {loadingMoreTopics ? "Loading..." : "Load more topics"}
          </button>
        )}
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {forumMode === "discussion" && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-blue-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Daily Discussion
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                AI-generated topic updated daily (UTC) · everyone can join the
                conversation
              </p>
            </div>
          )}

          {forumMode === "community" && !isMyPostsView && (
            <>
              {isAuthenticated ? (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-purple-100">
                  {!showCreateForm ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Community Forum
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Post articles and discuss with other members
                        </p>
                      </div>
                      <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700"
                      >
                        New Post
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreatePost} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Create Post
                        </h2>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newPostTitle}
                        onChange={(e) => setNewPostTitle(e.target.value)}
                        placeholder="Post title"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-purple-500"
                        maxLength={200}
                        required
                      />
                      <textarea
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        placeholder="Write your article..."
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y focus:outline-none focus:border-purple-500"
                        maxLength={5000}
                        required
                      />
                      <button
                        type="submit"
                        disabled={
                          creatingPost ||
                          !newPostTitle.trim() ||
                          !newPostContent.trim()
                        }
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:bg-gray-400"
                      >
                        {creatingPost ? "Publishing..." : "Publish Post"}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-center">
                  <p className="text-purple-900 text-sm mb-3">
                    Log in to post and like community articles
                  </p>
                  <Link
                    href="/account"
                    className="inline-block bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-purple-700"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </>
          )}

          {forumMode === "community" && isMyPostsView && isAuthenticated && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-purple-100">
              <h2 className="text-lg font-semibold text-gray-900">My Posts</h2>
              <p className="text-sm text-gray-500 mt-1">
                View, edit, or delete your community articles
              </p>
            </div>
          )}

          {displayedTopic ? (
            <>
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
              {editingPost && isMyPostsView ? (
                <form onSubmit={handleUpdatePost} className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900">Edit Post</h2>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-purple-500"
                    maxLength={200}
                    required
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y focus:outline-none focus:border-purple-500"
                    maxLength={5000}
                    required
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={
                        savingPost ||
                        !editTitle.trim() ||
                        !editContent.trim()
                      }
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:bg-gray-400"
                    >
                      {savingPost ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingPost}
                      className="px-6 py-3 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-6 gap-4">
                    <div>
                      <span
                        className={`text-xs font-medium text-white px-2 py-1 rounded-full ${
                          forumMode === "discussion"
                            ? "bg-blue-500"
                            : "bg-purple-500"
                        }`}
                      >
                        {forumMode === "discussion"
                          ? isTodayDiscussion
                            ? "Today"
                            : "Archive"
                          : isMyPostsView
                            ? "My Post"
                            : "Community"}
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900 mt-3">
                        {forumMode === "discussion"
                          ? "Daily Discussion"
                          : displayedTopic.title}
                      </h2>
                      {forumMode === "discussion" && !isTodayDiscussion && (
                        <p className="text-sm text-gray-500 mt-1">
                          {formatArchiveDate(
                            displayedTopic.date,
                            displayTimezone
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                      {isMyPostsView && (
                        <>
                          <button
                            type="button"
                            onClick={startEditingPost}
                            className="text-sm font-semibold text-purple-700 hover:text-purple-800 px-3 py-1 rounded-md border border-purple-200 hover:bg-purple-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={handleDeletePost}
                            disabled={deletingPost}
                            className="text-sm font-semibold text-red-600 hover:text-red-700 px-3 py-1 rounded-md border border-red-200 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deletingPost ? "Deleting..." : "Delete"}
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={handleShareLink}
                        className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                      >
                        {linkCopied ? "Link copied!" : "Share"}
                      </button>
                      {displayedTopicTimestamp && (
                        <time
                          dateTime={displayedTopic.createdAt}
                          title={displayedTopicTimestamp.title}
                          className="text-sm text-gray-500"
                        >
                          {displayedTopicTimestamp.label}
                          {displayedTopic.updatedAt &&
                            isEdited(
                              displayedTopic.createdAt,
                              displayedTopic.updatedAt
                            ) && (
                              <span className="text-gray-400"> · edited</span>
                            )}
                        </time>
                      )}
                    </div>
                  </div>

                  {forumMode === "discussion" ? (
                    <>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">
                        {displayedTopic.title}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        AI-generated discussion topic · updated daily (UTC)
                      </p>
                    </>
                  ) : (
                    !isMyPostsView &&
                    displayedTopic.authorUsername && (
                      <p className="text-sm text-gray-500 mb-4">
                        Posted by{" "}
                        <span className="font-medium text-gray-700">
                          <span
                            className={
                              isDeletedUserLabel(displayedTopic.authorUsername)
                                ? "text-gray-500 italic"
                                : undefined
                            }
                          >
                            {displayedTopic.authorUsername}
                          </span>
                        </span>
                      </p>
                    )
                  )}

                  <div className="text-gray-600 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
                    {displayedTopic.content}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-gray-500 text-sm">
                      <span>{totalComments} comments</span>
                      {isCommunityView &&
                        (!isMyPostsView && !isOwnPost ? (
                          <button
                            onClick={handleToggleLike}
                            disabled={liking || !isAuthenticated}
                            title={
                              !isAuthenticated ? "Log in to like posts" : undefined
                            }
                            className={`flex items-center gap-1 px-3 py-1 rounded-full border transition-colors ${
                              displayedTopic.likedByUser
                                ? "bg-purple-100 border-purple-300 text-purple-700"
                                : "border-gray-300 hover:border-purple-300 hover:text-purple-600"
                            } ${!isAuthenticated ? "opacity-60 cursor-not-allowed" : ""}`}
                          >
                            <span>{displayedTopic.likedByUser ? "♥" : "♡"}</span>
                            <span>{displayedTopic.likeCount ?? 0}</span>
                          </button>
                        ) : (
                          isCommunityView && (
                            <span className="text-gray-400">
                              {displayedTopic.likeCount ?? 0} likes
                            </span>
                          )
                        ))}
                    </div>
                    <a
                      href="#comment-section"
                      className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                    >
                      Join Discussion →
                    </a>
                  </div>
                </>
              )}
            </div>

          <div id="comment-section" className="bg-white rounded-xl shadow-sm p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Comments</h3>

            {isAuthenticated ? (
              <form onSubmit={handleCommentSubmit} className="mb-8">
                <p className="text-sm text-gray-500 mb-3">
                  Logged in as{" "}
                  <span className="font-semibold text-gray-900">
                    {user?.username}
                  </span>
                </p>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y min-h-[100px] mb-4 focus:outline-none focus:border-blue-500"
                  placeholder={
                    forumMode === "discussion"
                      ? "Share your thoughts on this discussion topic..."
                      : isMyPostsView
                        ? "Leave a comment on your post..."
                        : "Leave a comment on this post..."
                  }
                  rows={4}
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-gray-400"
                  disabled={!newComment.trim() || submitting}
                >
                  {submitting ? "Posting..." : "Post Comment"}
                </button>
              </form>
            ) : (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-6 mb-8 text-center">
                <p className="text-yellow-800 mb-4">
                  Log in to join the discussion.
                </p>
                <Link
                  href="/account"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Sign In
                </Link>
              </div>
            )}

            <div className="space-y-2">
              {comments.length === 0 ? (
                <p className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <ForumCommentThread
                    key={comment.id}
                    comment={comment}
                    user={user}
                    displayTimezone={displayTimezone}
                    isAuthenticated={isAuthenticated}
                    editingCommentId={editingCommentId}
                    editCommentText={editCommentText}
                    savingCommentId={savingCommentId}
                    likingCommentId={likingCommentId}
                    replyingToCommentId={replyingToCommentId}
                    replyText={replyText}
                    submittingReply={submittingReply}
                    onToggleLike={handleToggleCommentLike}
                    onStartEdit={startEditingComment}
                    onCancelEdit={cancelEditingComment}
                    onEditTextChange={setEditCommentText}
                    onUpdateComment={handleUpdateComment}
                    onDeleteComment={handleDeleteComment}
                    onStartReply={setReplyingToCommentId}
                    onCancelReply={() => {
                      setReplyingToCommentId(null);
                      setReplyText("");
                    }}
                    onReplyTextChange={setReplyText}
                    onSubmitReply={handleSubmitReply}
                  />
                ))
              )}
            </div>

            {commentPagination?.hasMore && (
              <button
                type="button"
                onClick={handleLoadMoreComments}
                disabled={loadingMoreComments}
                className="w-full mt-6 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMoreComments ? "Loading..." : "Load more comments"}
              </button>
            )}
          </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 mb-8 text-center">
              <p className="text-gray-500">
                {forumMode === "discussion"
                  ? "No discussion topics available."
                  : isMyPostsView
                    ? "Select a post to manage, or switch to All Posts to browse."
                    : "No community posts yet. Be the first to post!"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
