"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserIcon, SettingsIcon, CreditCardIcon, LogOutIcon } from "lucide-react";

export function NavUser() {
	const router = useRouter();
	const [user, setUser] = useState({ name: "Account", email: "", avatar: "" });

	useEffect(() => {
		const supabase = createClient();
		supabase.auth.getUser().then(({ data }) => {
			const u = data.user;
			if (!u) return;
			const meta = u.user_metadata ?? {};
			setUser({
				name: meta.full_name || meta.name || u.email?.split("@")[0] || "Account",
				email: u.email || "",
				avatar: meta.avatar_url || meta.picture || "",
			});
		});
	}, []);

	async function signOut() {
		const supabase = createClient();
		await supabase.auth.signOut();
		router.push("/login");
		router.refresh();
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label="Account menu"
						className="inline-flex cursor-pointer rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-1 focus-visible:ring-offset-background"
					/>
				}
			>
				<Avatar className="size-8">
					<AvatarImage src={user.avatar} />
					<AvatarFallback>{(user.name || "U").charAt(0).toUpperCase()}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-60">
				<div className="flex items-center gap-3 px-2 py-1.5">
					<Avatar className="size-9">
						<AvatarImage src={user.avatar} />
						<AvatarFallback>{(user.name || "U").charAt(0).toUpperCase()}</AvatarFallback>
					</Avatar>
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-foreground">{user.name}</p>
						<p className="truncate text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
						<UserIcon />
						Account
					</DropdownMenuItem>
					<DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings/notifications")}>
						<SettingsIcon />
						Settings
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings/billing")}>
						<CreditCardIcon />
						Plan & Billing
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem
						className="w-full cursor-pointer"
						variant="destructive"
						onClick={signOut}
					>
						<LogOutIcon />
						Log out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
