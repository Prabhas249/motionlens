"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import type { SidebarNavGroup, SidebarNavItem } from "@/components/app-shared";
import { ChevronRightIcon } from "lucide-react";

// Active = exact match on a real route. Dashboard also lights up on its subpaths.
function useIsActive() {
	const pathname = usePathname();
	return (item?: SidebarNavItem) => {
		const p = item?.path;
		if (!p || !p.startsWith("/")) return false;
		if (pathname === p) return true;
		return p === "/dashboard" && pathname.startsWith("/dashboard");
	};
}

export function NavGroup({ label, items }: SidebarNavGroup) {
	const isActive = useIsActive();
	return (
		<SidebarGroup>
			{label && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
			<SidebarMenu>
				{items.map((item) => {
					const active = isActive(item) || item.subItems?.some((i) => isActive(i));
					return (
						<Collapsible className="group/collapsible" defaultOpen={active} key={item.title} render={<SidebarMenuItem />}>{item.subItems?.length ? (
											<>
												<CollapsibleTrigger render={<SidebarMenuButton isActive={active} />}>{item.icon}<span>{item.title}</span><ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" /></CollapsibleTrigger>
												<CollapsibleContent>
													<SidebarMenuSub>
														{item.subItems?.map((subItem) => (
															<SidebarMenuSubItem key={subItem.title}>
																<SidebarMenuSubButton isActive={isActive(subItem)} render={<Link href={subItem.path ?? "#"} />}>{subItem.icon}<span>{subItem.title}</span></SidebarMenuSubButton>
															</SidebarMenuSubItem>
														))}
													</SidebarMenuSub>
												</CollapsibleContent>
											</>
										) : (
											<SidebarMenuButton isActive={active} render={<Link href={item.path ?? "#"} />}>{item.icon}<span>{item.title}</span></SidebarMenuButton>
										)}</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
