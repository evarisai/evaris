import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import {
	ChevronDown,
	Database,
	FlaskConical,
	FolderKanban,
	LayoutDashboard,
	LogOut,
	Monitor,
	Moon,
	Network,
	Palette,
	ScrollText,
	Settings,
	Sun,
	User,
} from "lucide-react"
import { useTheme } from "next-themes"
import { EvarisSymbol } from "@/components/Logo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar"
import { signOut, useSession } from "@/lib/auth-client"

const menuItems = [
	{ title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
	{ title: "Projects", url: "/projects", icon: FolderKanban },
	{ title: "Datasets", url: "/datasets", icon: Database },
	{ title: "Evals", url: "/evals", icon: FlaskConical },
	{ title: "Logs", url: "/logs", icon: ScrollText },
	{ title: "Traces", url: "/traces", icon: Network },
	{ title: "Settings", url: "/settings", icon: Settings },
]

export function AppSidebar() {
	const location = useLocation()
	const navigate = useNavigate()
	const { data: session } = useSession()
	const user = session?.user
	const { theme, setTheme } = useTheme()

	const handleSignOut = async () => {
		await signOut()
		navigate({ to: "/login" })
	}

	const getUserInitials = () => {
		if (!user?.name) return "U"
		const names = user.name.split(" ")
		if (names.length >= 2) {
			return `${names[0][0]}${names[1][0]}`.toUpperCase()
		}
		return user.name.substring(0, 2).toUpperCase()
	}

	return (
		<Sidebar className="border-r border-sidebar-border">
			<SidebarHeader className="p-4 pb-2">
				<Link to="/dashboard" className="flex items-center gap-2 text-foreground px-1">
					<EvarisSymbol className="h-8 w-8" />
					<span className="text-[1.375rem] font-semibold tracking-tight leading-none">evaris</span>
				</Link>
			</SidebarHeader>

			<SidebarSeparator className="mx-4" />

			<SidebarContent className="px-2">
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-0.5">
							{menuItems.map((item, index) => {
								const isActive = location.pathname.startsWith(item.url)
								return (
									<SidebarMenuItem key={item.title} style={{ animationDelay: `${index * 30}ms` }}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											data-testid={`nav-${item.title.toLowerCase()}`}
											className={`
                        group relative px-3 py-2 rounded-lg transition-all duration-200
                        ${
													isActive
														? "bg-foreground text-background font-medium shadow-sm"
														: "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground"
												}
                      `}
										>
											<Link to={item.url} className="flex items-center gap-3">
												<item.icon
													className={`h-4 w-4 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`}
												/>
												<span className="text-sm">{item.title}</span>
												{isActive && (
													<span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary animate-scale-in" />
												)}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								)
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-3 mt-auto">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-sidebar-accent group"
							data-testid="button-user-menu"
						>
							<Avatar className="h-9 w-9 ring-2 ring-sidebar-border">
								<AvatarFallback className="bg-foreground/10 text-foreground text-sm font-medium">
									{getUserInitials()}
								</AvatarFallback>
							</Avatar>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium truncate">{user?.name || "User"}</p>
								<p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
							</div>
							<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-56 p-1">
						<DropdownMenuItem asChild className="rounded-md">
							<Link to="/settings" className="flex items-center cursor-pointer">
								<User className="mr-2 h-4 w-4" />
								Account Settings
							</Link>
						</DropdownMenuItem>
						<div className="flex items-center gap-2 px-2 py-1.5 text-sm">
							<Palette className="h-4 w-4 text-foreground" />
							<span className="flex-1">Theme</span>
							<div className="flex items-center gap-0.5 p-0.5 rounded-md bg-muted">
								<button
									type="button"
									onClick={() => setTheme("system")}
									className={`p-1.5 rounded transition-all ${
										theme === "system"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title="System"
									data-testid="theme-system"
								>
									<Monitor className="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onClick={() => setTheme("light")}
									className={`p-1.5 rounded transition-all ${
										theme === "light"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title="Light"
									data-testid="theme-light"
								>
									<Sun className="h-3.5 w-3.5" />
								</button>
								<button
									type="button"
									onClick={() => setTheme("dark")}
									className={`p-1.5 rounded transition-all ${
										theme === "dark"
											? "bg-background text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
									title="Dark"
									data-testid="theme-dark"
								>
									<Moon className="h-3.5 w-3.5" />
								</button>
							</div>
						</div>
						<DropdownMenuSeparator className="my-1" />
						<DropdownMenuItem
							onClick={handleSignOut}
							data-testid="button-logout"
							className="rounded-md text-destructive focus:text-destructive cursor-pointer"
						>
							<LogOut className="mr-2 h-4 w-4" />
							Sign out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarFooter>
		</Sidebar>
	)
}
