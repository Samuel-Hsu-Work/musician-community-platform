import AdminShell from "../../components/admin/AdminShell";
import ForumModerationAdmin from "../../components/admin/ForumModerationAdmin";

export default function AdminForumPage() {
  return (
    <AdminShell
      title="Forum Posts"
      description="Hide or restore community posts and discussions from public Forum views."
    >
      <ForumModerationAdmin />
    </AdminShell>
  );
}
