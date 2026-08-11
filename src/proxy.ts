import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createProxy(routing);

export const config = {
  // Corre em todas as rotas exceto assets estáticos e internos do Next
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
