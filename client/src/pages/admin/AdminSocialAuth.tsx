import { AdminLayout } from "@/components/AdminLayout";
import { SocialAuthFlow } from "@/components/SocialAuthFlow";

export default function AdminSocialAuth() {
  return (
    <AdminLayout>
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Social Auth</h1>
          <p className="text-sm text-muted-foreground">
            Gestione delle sessioni autenticate per lo scraping headless di Instagram e TikTok.
            Le sessioni sono usate dal GTE per raccogliere dati reali di engagement.
          </p>
        </div>
        <SocialAuthFlow />
      </div>
    </AdminLayout>
  );
}
