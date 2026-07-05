import AdminShell from "../../components/admin/AdminShell";
import LearningTableMatrixAdmin from "../../components/admin/LearningTableMatrixAdmin";

export default function AdminLearningTablePage() {
  return (
    <AdminShell
      title="AI Learning Table"
      description="See community-approved insights per theory topic and learning style — what Theory UI and AI prompts use."
    >
      <LearningTableMatrixAdmin />
    </AdminShell>
  );
}
