"use client";

import { formatTimestampDisplay } from "../utils/datetime";
import { isDeletedUserLabel } from "../constants/deletedUser";
import { Comment, User, isEdited } from "./forumTypes";

interface ForumCommentThreadProps {
  comment: Comment;
  user: User | null;
  displayTimezone: string;
  isAuthenticated: boolean;
  editingCommentId: string | null;
  editCommentText: string;
  savingCommentId: string | null;
  likingCommentId: string | null;
  replyingToCommentId: string | null;
  replyText: string;
  submittingReply: boolean;
  isReply?: boolean;
  onToggleLike: (commentId: string) => void;
  onStartEdit: (comment: Comment) => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
  onUpdateComment: (e: React.FormEvent, commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  onStartReply: (commentId: string) => void;
  onCancelReply: () => void;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: (e: React.FormEvent, parentId: string) => void;
}

function isOwnComment(comment: Comment, user: User | null): boolean {
  if (!user) return false;
  return (
    comment.userId === user.id ||
    (!comment.userId &&
      comment.username.toLowerCase() === user.username.toLowerCase())
  );
}

export default function ForumCommentThread({
  comment,
  user,
  displayTimezone,
  isAuthenticated,
  editingCommentId,
  editCommentText,
  savingCommentId,
  likingCommentId,
  replyingToCommentId,
  replyText,
  submittingReply,
  isReply = false,
  onToggleLike,
  onStartEdit,
  onCancelEdit,
  onEditTextChange,
  onUpdateComment,
  onDeleteComment,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onSubmitReply,
}: ForumCommentThreadProps) {
  const own = isOwnComment(comment, user);
  const isDeletedAuthor = isDeletedUserLabel(comment.username);
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyingToCommentId === comment.id;
  const timestamp = formatTimestampDisplay(
    comment.createdAt,
    displayTimezone
  );

  return (
    <div className={isReply ? "mt-3" : "pb-6 border-b border-gray-100 last:border-0"}>
      <div className={`flex gap-3 ${isReply ? "ml-10 pl-3 border-l-2 border-gray-200" : "gap-4"}`}>
        <div
          className={`${
            isReply ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm"
          } ${
            isDeletedAuthor ? "bg-gray-400" : "bg-blue-600"
          } rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
        >
          {isDeletedAuthor ? "?" : comment.username?.charAt(0).toUpperCase() || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4
              className={`font-semibold ${
                isDeletedAuthor ? "text-gray-500 italic" : "text-gray-900"
              }`}
            >
              {comment.username}
            </h4>
            <time
              dateTime={comment.createdAt}
              title={timestamp.title}
              className="text-xs text-gray-500"
            >
              {timestamp.label}
            </time>
            {isEdited(comment.createdAt, comment.updatedAt) && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {!isEditing && (
            <p className="text-gray-600 leading-relaxed mb-2 whitespace-pre-wrap">
              {comment.text}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {!own && (
              <button
                type="button"
                onClick={() => onToggleLike(comment.id)}
                disabled={likingCommentId === comment.id || !isAuthenticated}
                title={!isAuthenticated ? "Log in to like comments" : undefined}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                  comment.likedByUser
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                } ${!isAuthenticated ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span>{comment.likedByUser ? "♥" : "♡"}</span>
                <span>{comment.likeCount ?? 0}</span>
              </button>
            )}

            {own && !isEditing && (comment.likeCount ?? 0) > 0 && (
              <span className="text-xs text-gray-400">
                {comment.likeCount} likes
              </span>
            )}

            {!isReply && isAuthenticated && !isEditing && (
              <button
                type="button"
                onClick={() =>
                  isReplying ? onCancelReply() : onStartReply(comment.id)
                }
                className="text-xs font-semibold text-gray-600 hover:text-blue-600 px-2 py-1 rounded-md hover:bg-blue-50"
              >
                {isReplying ? "Cancel" : "Reply"}
              </button>
            )}

            {own && !isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => onStartEdit(comment)}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteComment(comment.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md border border-red-200 hover:bg-red-50"
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {own && isEditing && (
            <form
              onSubmit={(e) => onUpdateComment(e, comment.id)}
              className="mt-2 space-y-2"
            >
              <textarea
                value={editCommentText}
                onChange={(e) => onEditTextChange(e.target.value)}
                rows={3}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y focus:outline-none focus:border-blue-500"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    savingCommentId === comment.id || !editCommentText.trim()
                  }
                  className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingCommentId === comment.id ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
                  className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {!isReply && isReplying && isAuthenticated && (
            <form
              onSubmit={(e) => onSubmitReply(e, comment.id)}
              className="mt-3 space-y-2"
            >
              <textarea
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={`Reply to ${comment.username}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 resize-y focus:outline-none focus:border-blue-500"
                required
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {submittingReply ? "Posting..." : "Post Reply"}
                </button>
                <button
                  type="button"
                  onClick={onCancelReply}
                  className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-0">
          {comment.replies.map((reply) => (
            <ForumCommentThread
              key={reply.id}
              comment={reply}
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
              isReply
              onToggleLike={onToggleLike}
              onStartEdit={onStartEdit}
              onCancelEdit={onCancelEdit}
              onEditTextChange={onEditTextChange}
              onUpdateComment={onUpdateComment}
              onDeleteComment={onDeleteComment}
              onStartReply={onStartReply}
              onCancelReply={onCancelReply}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}
