import AdminShell from "../../components/admin/AdminShell";
import ForumLearningAdmin from "../../components/admin/ForumLearningAdmin";

export default function AdminLearningPage() {
  return (
    <AdminShell
      title="Forum Learning"
      description="Run the AI pipeline and approve insights for Theory pages."
    >
      <ForumLearningAdmin />
    </AdminShell>
  );
}
