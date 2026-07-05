import AdminShell from "../../components/admin/AdminShell";
import TheoryCmsAdmin from "../../components/admin/TheoryCmsAdmin";

export default function AdminTheoryPage() {
  return (
    <AdminShell
      title="Theory Content Management"
      description="Edit standard definitions stored in the database for Theory topic pages."
    >
      <TheoryCmsAdmin />
    </AdminShell>
  );
}
