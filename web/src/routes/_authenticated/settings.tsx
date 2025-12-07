import { createFileRoute } from "@tanstack/react-router"
import { formatDistanceToNow } from "date-fns"
import {
	Building2,
	Copy,
	Key,
	Loader2,
	MoreHorizontal,
	Plus,
	RotateCw,
	Trash2,
	User,
	Users,
} from "lucide-react"
import { useState } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc"

export const Route = createFileRoute("/_authenticated/settings")({
	component: Settings,
})

type ApiKeyPermission = "READ_ONLY" | "READ_WRITE" | "ADMIN"

function Settings() {
	const { toast } = useToast()
	const { data: session, isPending } = useSession()

	const [notifications, setNotifications] = useState({
		evalComplete: true,
		evalFailed: true,
		weeklyReport: false,
	})

	// Local state for editable fields
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")

	// API Keys state
	const [createKeyOpen, setCreateKeyOpen] = useState(false)
	const [newKeyName, setNewKeyName] = useState("")
	const [newKeyPermission, setNewKeyPermission] = useState<ApiKeyPermission>("READ_ONLY")
	const [createdKey, setCreatedKey] = useState<string | null>(null)
	const [showCreatedKey, setShowCreatedKey] = useState(false)
	const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null)
	const [rotateKeyId, setRotateKeyId] = useState<string | null>(null)
	const [rotatedKey, setRotatedKey] = useState<string | null>(null)

	// Team state
	const [inviteEmail, setInviteEmail] = useState("")
	const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER" | "VIEWER">("MEMBER")
	const [removeMemberId, setRemoveMemberId] = useState<string | null>(null)
	const [revokeInvitationId, setRevokeInvitationId] = useState<string | null>(null)

	// API Keys queries and mutations
	const { data: apiKeysData, refetch: refetchApiKeys } = trpc.apiKeys.list.useQuery()

	// Team queries and mutations
	const { data: teamData, refetch: refetchTeam } = trpc.team.list.useQuery()
	const { data: invitationsData, refetch: refetchInvitations } = trpc.invitations.list.useQuery()

	const createInvitation = trpc.invitations.create.useMutation({
		onSuccess: () => {
			setInviteEmail("")
			setInviteRole("MEMBER")
			refetchInvitations()
			toast({
				title: "Invitation sent",
				description: `An invitation has been sent to ${inviteEmail}.`,
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const revokeInvitation = trpc.invitations.revoke.useMutation({
		onSuccess: () => {
			setRevokeInvitationId(null)
			refetchInvitations()
			toast({
				title: "Invitation revoked",
				description: "The invitation has been cancelled.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const resendInvitation = trpc.invitations.resend.useMutation({
		onSuccess: () => {
			refetchInvitations()
			toast({
				title: "Invitation resent",
				description: "A new invitation has been sent.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const removeMember = trpc.team.remove.useMutation({
		onSuccess: () => {
			setRemoveMemberId(null)
			refetchTeam()
			toast({
				title: "Member removed",
				description: "The team member has been removed.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const createApiKey = trpc.apiKeys.create.useMutation({
		onSuccess: (data) => {
			setCreatedKey(data.key)
			setShowCreatedKey(true)
			setNewKeyName("")
			setNewKeyPermission("READ_ONLY")
			refetchApiKeys()
			toast({
				title: "API key created",
				description: "Make sure to copy your key now. You won't be able to see it again.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const deleteApiKey = trpc.apiKeys.delete.useMutation({
		onSuccess: () => {
			setDeleteKeyId(null)
			refetchApiKeys()
			toast({
				title: "API key deleted",
				description: "The API key has been permanently deleted.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	const rotateApiKey = trpc.apiKeys.rotate.useMutation({
		onSuccess: (data) => {
			setRotateKeyId(null)
			setRotatedKey(data.key)
			refetchApiKeys()
			toast({
				title: "API key rotated",
				description: "Make sure to copy your new key now. You won't be able to see it again.",
			})
		},
		onError: (error) => {
			toast({
				title: "Error",
				description: error.message,
				variant: "destructive",
			})
		},
	})

	// Initialize with session data when it loads
	if (session?.user && !name && !email) {
		setName(session.user.name || "")
		setEmail(session.user.email || "")
	}

	const handleSaveProfile = () => {
		// TODO: Implement profile update API
		toast({
			title: "Coming soon",
			description: "Profile updates will be available soon.",
		})
	}

	const handleSaveWorkspace = () => {
		// TODO: Implement workspace update API
		toast({
			title: "Coming soon",
			description: "Workspace settings will be available soon.",
		})
	}

	const handleSaveNotifications = () => {
		// TODO: Implement notification preferences API
		toast({
			title: "Coming soon",
			description: "Notification preferences will be available soon.",
		})
	}

	const handleSaveKeys = () => {
		// TODO: Implement API keys storage
		toast({
			title: "Coming soon",
			description: "LLM provider key storage will be available soon.",
		})
	}

	const handleInvite = () => {
		if (inviteEmail) {
			createInvitation.mutate({
				email: inviteEmail,
				role: inviteRole,
			})
		}
	}

	const handleRevokeInvitation = () => {
		if (revokeInvitationId) {
			revokeInvitation.mutate({ id: revokeInvitationId })
		}
	}

	const handleRemoveMember = () => {
		if (removeMemberId) {
			removeMember.mutate({ membershipId: removeMemberId })
		}
	}

	const getRoleBadge = (role: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
			OWNER: "default",
			ADMIN: "secondary",
			MEMBER: "outline",
			VIEWER: "outline",
		}
		return <Badge variant={variants[role] || "outline"}>{role}</Badge>
	}

	const handleCreateApiKey = () => {
		if (newKeyName) {
			createApiKey.mutate({
				name: newKeyName,
				permissions: newKeyPermission,
			})
		}
	}

	const handleDeleteApiKey = () => {
		if (deleteKeyId) {
			deleteApiKey.mutate({ id: deleteKeyId })
		}
	}

	const handleRotateApiKey = () => {
		if (rotateKeyId) {
			rotateApiKey.mutate({ id: rotateKeyId })
		}
	}

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
		toast({
			title: "Copied",
			description: "API key copied to clipboard.",
		})
	}

	const getPermissionBadge = (permission: string) => {
		const variants: Record<string, "default" | "secondary" | "destructive"> = {
			READ_ONLY: "secondary",
			READ_WRITE: "default",
			ADMIN: "destructive",
		}
		const labels: Record<string, string> = {
			READ_ONLY: "Read Only",
			READ_WRITE: "Read/Write",
			ADMIN: "Admin",
		}
		return (
			<Badge variant={variants[permission] || "secondary"}>
				{labels[permission] || permission}
			</Badge>
		)
	}

	if (isPending) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-semibold">Settings</h1>
				<p className="text-muted-foreground mt-1">Manage your account and preferences</p>
			</div>

			<Tabs defaultValue="general" className="space-y-6">
				<TabsList>
					<TabsTrigger value="general" data-testid="tab-general">
						General
					</TabsTrigger>
					<TabsTrigger value="notifications" data-testid="tab-notifications">
						Notifications
					</TabsTrigger>
					<TabsTrigger value="api" data-testid="tab-api">
						API Keys
					</TabsTrigger>
					<TabsTrigger value="team" data-testid="tab-team">
						Team
					</TabsTrigger>
				</TabsList>

				<TabsContent value="general" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<User className="h-4 w-4" />
								Profile
							</CardTitle>
							<CardDescription>Your personal information</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid gap-4 sm:grid-cols-2">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										placeholder="Your name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										data-testid="input-name"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										type="email"
										placeholder="Your email"
										value={email}
										disabled
										className="bg-muted"
										data-testid="input-email"
									/>
									<p className="text-xs text-muted-foreground">Email cannot be changed</p>
								</div>
							</div>
							<Button onClick={handleSaveProfile} data-testid="button-save-profile">
								Save Changes
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Building2 className="h-4 w-4" />
								Workspace
							</CardTitle>
							<CardDescription>Your organization settings</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="workspace">Workspace Name</Label>
								<Input
									id="workspace"
									placeholder="Workspace name"
									defaultValue={
										session?.user?.name ? `${session.user.name}'s Workspace` : "My Workspace"
									}
									data-testid="input-workspace"
								/>
							</div>
							<Button onClick={handleSaveWorkspace} data-testid="button-save-workspace">
								Save Changes
							</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="notifications" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Email Notifications</CardTitle>
							<CardDescription>Configure when you receive email notifications</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Evaluation Complete</Label>
									<p className="text-sm text-muted-foreground">
										Receive an email when an evaluation finishes
									</p>
								</div>
								<Switch
									checked={notifications.evalComplete}
									onCheckedChange={(checked) =>
										setNotifications({ ...notifications, evalComplete: checked })
									}
									data-testid="switch-eval-complete"
								/>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Evaluation Failed</Label>
									<p className="text-sm text-muted-foreground">
										Get notified when an evaluation fails
									</p>
								</div>
								<Switch
									checked={notifications.evalFailed}
									onCheckedChange={(checked) =>
										setNotifications({ ...notifications, evalFailed: checked })
									}
									data-testid="switch-eval-failed"
								/>
							</div>
							<Separator />
							<div className="flex items-center justify-between">
								<div className="space-y-0.5">
									<Label>Weekly Report</Label>
									<p className="text-sm text-muted-foreground">
										Receive a weekly summary of all evaluations
									</p>
								</div>
								<Switch
									checked={notifications.weeklyReport}
									onCheckedChange={(checked) =>
										setNotifications({ ...notifications, weeklyReport: checked })
									}
									data-testid="switch-weekly-report"
								/>
							</div>
							<Separator />
							<Button onClick={handleSaveNotifications}>Save Preferences</Button>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="api" className="space-y-6">
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="text-base flex items-center gap-2">
										<Key className="h-4 w-4" />
										API Keys
									</CardTitle>
									<CardDescription>
										Manage your API keys for programmatic access to the Evaris platform
									</CardDescription>
								</div>
								<Button onClick={() => setCreateKeyOpen(true)} data-testid="button-create-api-key">
									<Plus className="h-4 w-4 mr-2" />
									Create Key
								</Button>
							</div>
						</CardHeader>
						<CardContent>
							{!apiKeysData || apiKeysData.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-8 text-center">
									<Key className="h-12 w-12 text-muted-foreground mb-4" />
									<h3 className="text-lg font-medium mb-2">No API keys yet</h3>
									<p className="text-muted-foreground mb-4">
										Create an API key to access the Evaris API programmatically
									</p>
									<Button onClick={() => setCreateKeyOpen(true)} variant="outline">
										<Plus className="h-4 w-4 mr-2" />
										Create your first API key
									</Button>
								</div>
							) : (
								<div className="rounded-lg border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Name</TableHead>
												<TableHead>Key</TableHead>
												<TableHead>Permission</TableHead>
												<TableHead>Last Used</TableHead>
												<TableHead>Created</TableHead>
												<TableHead className="w-[50px]"></TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{apiKeysData.map((apiKey) => (
												<TableRow key={apiKey.id}>
													<TableCell className="font-medium">{apiKey.name}</TableCell>
													<TableCell>
														<code className="text-xs bg-muted px-2 py-1 rounded">
															{apiKey.keyPrefix}...
														</code>
													</TableCell>
													<TableCell>{getPermissionBadge(apiKey.permissions)}</TableCell>
													<TableCell className="text-muted-foreground text-sm">
														{apiKey.lastUsedAt
															? formatDistanceToNow(new Date(apiKey.lastUsedAt), {
																	addSuffix: true,
																})
															: "Never"}
													</TableCell>
													<TableCell className="text-muted-foreground text-sm">
														{formatDistanceToNow(new Date(apiKey.createdAt), {
															addSuffix: true,
														})}
													</TableCell>
													<TableCell>
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<Button size="icon" variant="ghost">
																	<MoreHorizontal className="h-4 w-4" />
																</Button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem onClick={() => setRotateKeyId(apiKey.id)}>
																	<RotateCw className="mr-2 h-4 w-4" />
																	Rotate Key
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => setDeleteKeyId(apiKey.id)}
																	className="text-destructive focus:text-destructive"
																>
																	<Trash2 className="mr-2 h-4 w-4" />
																	Delete
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-base">LLM Provider Keys</CardTitle>
							<CardDescription>Configure API keys for AI providers (coming soon)</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="openai-key">OpenAI API Key</Label>
								<Input
									id="openai-key"
									type="password"
									placeholder="sk-..."
									disabled
									className="bg-muted"
									data-testid="input-openai-key"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="anthropic-key">Anthropic API Key</Label>
								<Input
									id="anthropic-key"
									type="password"
									placeholder="sk-ant-..."
									disabled
									className="bg-muted"
									data-testid="input-anthropic-key"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="google-key">Google AI API Key</Label>
								<Input
									id="google-key"
									type="password"
									placeholder="AIza..."
									disabled
									className="bg-muted"
									data-testid="input-google-key"
								/>
							</div>
							<Button onClick={handleSaveKeys} disabled data-testid="button-save-keys">
								Save Keys
							</Button>
							<p className="text-xs text-muted-foreground">
								LLM provider key storage will be available soon.
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="team" className="space-y-6">
					{/* Team Members */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base flex items-center gap-2">
								<Users className="h-4 w-4" />
								Team Members
							</CardTitle>
							<CardDescription>Manage who has access to this workspace</CardDescription>
						</CardHeader>
						<CardContent>
							{!teamData || teamData.length === 0 ? (
								<p className="text-sm text-muted-foreground">No team members yet.</p>
							) : (
								<div className="space-y-3">
									{teamData.map((member) => (
										<div
											key={member.id}
											className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
										>
											<div>
												<p className="text-sm font-medium">
													{member.name || "Unknown"}
													{member.isCurrentUser && (
														<span className="text-muted-foreground ml-1">(you)</span>
													)}
												</p>
												<p className="text-xs text-muted-foreground">{member.email}</p>
											</div>
											<div className="flex items-center gap-2">
												{getRoleBadge(member.role)}
												{!member.isCurrentUser && member.role !== "OWNER" && (
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button size="icon" variant="ghost">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => setRemoveMemberId(member.id)}
																className="text-destructive focus:text-destructive"
															>
																<Trash2 className="mr-2 h-4 w-4" />
																Remove
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												)}
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Pending Invitations */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Pending Invitations</CardTitle>
							<CardDescription>
								Invitations that have been sent but not yet accepted
							</CardDescription>
						</CardHeader>
						<CardContent>
							{!invitationsData ||
							invitationsData.filter((i) => i.status === "PENDING").length === 0 ? (
								<p className="text-sm text-muted-foreground">No pending invitations.</p>
							) : (
								<div className="space-y-3">
									{invitationsData
										.filter((i) => i.status === "PENDING")
										.map((invitation) => (
											<div
												key={invitation.id}
												className="flex items-center justify-between p-3 rounded-lg border"
											>
												<div>
													<p className="text-sm font-medium">{invitation.email}</p>
													<p className="text-xs text-muted-foreground">
														Expires{" "}
														{formatDistanceToNow(new Date(invitation.expiresAt), {
															addSuffix: true,
														})}
													</p>
												</div>
												<div className="flex items-center gap-2">
													{getRoleBadge(invitation.role)}
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button size="icon" variant="ghost">
																<MoreHorizontal className="h-4 w-4" />
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={() => resendInvitation.mutate({ id: invitation.id })}
															>
																<RotateCw className="mr-2 h-4 w-4" />
																Resend
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={() => setRevokeInvitationId(invitation.id)}
																className="text-destructive focus:text-destructive"
															>
																<Trash2 className="mr-2 h-4 w-4" />
																Revoke
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>
										))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Invite New Member */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Invite Team Member</CardTitle>
							<CardDescription>Send an invitation to join your workspace</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex gap-2">
								<Input
									id="invite-email"
									type="email"
									placeholder="email@example.com"
									value={inviteEmail}
									onChange={(e) => setInviteEmail(e.target.value)}
									className="flex-1"
									data-testid="input-invite-email"
								/>
								<Select
									value={inviteRole}
									onValueChange={(value: "ADMIN" | "MEMBER" | "VIEWER") => setInviteRole(value)}
								>
									<SelectTrigger className="w-[130px]" data-testid="select-invite-role">
										<SelectValue placeholder="Role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ADMIN">Admin</SelectItem>
										<SelectItem value="MEMBER">Member</SelectItem>
										<SelectItem value="VIEWER">Viewer</SelectItem>
									</SelectContent>
								</Select>
								<Button
									onClick={handleInvite}
									disabled={!inviteEmail || createInvitation.isPending}
									data-testid="button-invite"
								>
									{createInvitation.isPending ? "Sending..." : "Invite"}
								</Button>
							</div>
							<p className="text-xs text-muted-foreground">
								Invitations expire after 7 days. The invited user will receive an email with
								instructions.
							</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Create API Key Dialog */}
			<Dialog open={createKeyOpen} onOpenChange={setCreateKeyOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Create API Key</DialogTitle>
						<DialogDescription>
							Create a new API key for programmatic access to the Evaris platform.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="space-y-2">
							<Label>Key Name</Label>
							<Input
								placeholder="e.g., Production Server"
								value={newKeyName}
								onChange={(e) => setNewKeyName(e.target.value)}
								data-testid="input-api-key-name"
							/>
						</div>
						<div className="space-y-2">
							<Label>Permission Level</Label>
							<Select
								value={newKeyPermission}
								onValueChange={(value: ApiKeyPermission) => setNewKeyPermission(value)}
							>
								<SelectTrigger data-testid="select-api-key-permission">
									<SelectValue placeholder="Select permission" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="READ_ONLY">Read Only - View data only</SelectItem>
									<SelectItem value="READ_WRITE">Read/Write - Create and update data</SelectItem>
									<SelectItem value="ADMIN">Admin - Full access including delete</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setCreateKeyOpen(false)}
							data-testid="button-cancel-create-key"
						>
							Cancel
						</Button>
						<Button
							onClick={handleCreateApiKey}
							disabled={!newKeyName || createApiKey.isPending}
							data-testid="button-confirm-create-key"
						>
							{createApiKey.isPending ? "Creating..." : "Create Key"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Show Created Key Dialog */}
			<Dialog open={showCreatedKey} onOpenChange={setShowCreatedKey}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>API Key Created</DialogTitle>
						<DialogDescription>
							Copy your API key now. You won't be able to see it again!
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
							<code className="flex-1 text-sm font-mono break-all">{createdKey}</code>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => createdKey && copyToClipboard(createdKey)}
								data-testid="button-copy-created-key"
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-sm text-muted-foreground mt-3">
							Store this key securely. For security, we only show this key once.
						</p>
					</div>
					<DialogFooter>
						<Button
							onClick={() => {
								setShowCreatedKey(false)
								setCreatedKey(null)
								setCreateKeyOpen(false)
							}}
							data-testid="button-done-created-key"
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Show Rotated Key Dialog */}
			<Dialog open={!!rotatedKey} onOpenChange={(open) => !open && setRotatedKey(null)}>
				<DialogContent className="sm:max-w-[500px]">
					<DialogHeader>
						<DialogTitle>API Key Rotated</DialogTitle>
						<DialogDescription>
							Your old key has been invalidated. Copy your new API key now!
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						<div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
							<code className="flex-1 text-sm font-mono break-all">{rotatedKey}</code>
							<Button
								size="icon"
								variant="ghost"
								onClick={() => rotatedKey && copyToClipboard(rotatedKey)}
								data-testid="button-copy-rotated-key"
							>
								<Copy className="h-4 w-4" />
							</Button>
						</div>
						<p className="text-sm text-muted-foreground mt-3">
							Update your applications with this new key. The old key no longer works.
						</p>
					</div>
					<DialogFooter>
						<Button onClick={() => setRotatedKey(null)} data-testid="button-done-rotated-key">
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete API Key Confirmation */}
			<AlertDialog open={!!deleteKeyId} onOpenChange={(open) => !open && setDeleteKeyId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete API Key</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this API key? Any applications using this key will
							immediately lose access. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteApiKey}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{deleteApiKey.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Rotate API Key Confirmation */}
			<AlertDialog open={!!rotateKeyId} onOpenChange={(open) => !open && setRotateKeyId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Rotate API Key</AlertDialogTitle>
						<AlertDialogDescription>
							This will generate a new key and immediately invalidate the old one. Any applications
							using the current key will need to be updated.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleRotateApiKey}>
							{rotateApiKey.isPending ? "Rotating..." : "Rotate Key"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Remove Team Member Confirmation */}
			<AlertDialog
				open={!!removeMemberId}
				onOpenChange={(open) => !open && setRemoveMemberId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Team Member</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove this team member? They will lose access to all
							organization resources immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveMember}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{removeMember.isPending ? "Removing..." : "Remove"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Revoke Invitation Confirmation */}
			<AlertDialog
				open={!!revokeInvitationId}
				onOpenChange={(open) => !open && setRevokeInvitationId(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to revoke this invitation? The invited user will no longer be
							able to join the organization using this invitation.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRevokeInvitation}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{revokeInvitation.isPending ? "Revoking..." : "Revoke"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
