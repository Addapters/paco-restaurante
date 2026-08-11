import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Wrappers de navegação conscientes do locale — usar em vez dos de next/link e next/navigation
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
