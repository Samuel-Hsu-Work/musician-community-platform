import AdminShell from "../../components/admin/AdminShell";
import UsersAdmin from "../../components/admin/UsersAdmin";

export default function AdminUsersPage() {
  return (
    <AdminShell
      title="Users"
      description="View accounts and grant or revoke admin access."
    >
      <UsersAdmin />
    </AdminShell>
  );
}
