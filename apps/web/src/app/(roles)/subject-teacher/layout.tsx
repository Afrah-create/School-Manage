import { SubjectTeacherSidebar } from "@/components/layout/sidebars/SubjectTeacherSidebar";
import { Header } from "@/components/layout/Header";

export default function SubjectTeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <SubjectTeacherSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-auto">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
