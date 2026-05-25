'use client'

import { useState, useEffect, useCallback } from 'react'
import { getKeygenApi } from '@/lib/api'
import { User } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Filter,
  MoreVertical,
  Users,
  UserCheck,
  UserX,
  Shield,
  Trash2,
  Mail,
  Calendar,
  Ban,
  CheckCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { CreateUserDialog } from './create-user-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export function UserManagement() {
  const api = getKeygenApi()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [confirmBanOpen, setConfirmBanOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [pendingAction, setPendingAction] = useState<'ban' | 'unban' | 'delete' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)

      const response = await api.users.list({
        page: {
          size: 100,
          number: 1,
        },
      })

      setUsers(response.data || [])
    } catch (error: unknown) {
      handleLoadError(error, 'users')
    } finally {
      setLoading(false)
    }
  }, [api.users])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const isBanned = (user: User) => {
    return user.attributes.banned === true || user.attributes.status === 'banned'
  }

  const filteredUsers = users.filter((user) => {
    const query = searchTerm.toLowerCase()

    const matchesSearch =
      !query ||
      user.attributes.email?.toLowerCase().includes(query) ||
      user.attributes.firstName?.toLowerCase().includes(query) ||
      user.attributes.lastName?.toLowerCase().includes(query) ||
      user.attributes.fullName?.toLowerCase().includes(query)

    const banned = isBanned(user)

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !banned) ||
      (statusFilter === 'banned' && banned)

    return matchesSearch && matchesStatus
  })

  const getStatusColor = (banned: boolean) => {
    return banned
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-green-100 text-green-800 border-green-200'
  }

  const getStatusIcon = (banned: boolean) => {
    return banned
      ? <Ban className="h-3 w-3" />
      : <CheckCircle className="h-3 w-3" />
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'

    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
    }

    if (firstName) {
      return firstName.charAt(0).toUpperCase()
    }

    if (lastName) {
      return lastName.charAt(0).toUpperCase()
    }

    if (email) {
      return email.charAt(0).toUpperCase()
    }

    return 'U'
  }

  const getFullName = (user: User) => {
    if (user.attributes.fullName) return user.attributes.fullName

    const firstName = user.attributes.firstName || ''
    const lastName = user.attributes.lastName || ''
    const fullName = `${firstName} ${lastName}`.trim()

    return fullName || 'Unknown User'
  }

  const handleBanUser = (user: User) => {
    setPendingUser(user)
    setPendingAction(isBanned(user) ? 'unban' : 'ban')
    setConfirmBanOpen(true)
  }

  const handleDeleteUser = (user: User) => {
    setPendingUser(user)
    setPendingAction('delete')
    setConfirmDeleteOpen(true)
  }

  const executePendingAction = async () => {
    if (!pendingUser || !pendingAction) return

    try {
      setConfirmLoading(true)

      if (pendingAction === 'ban') {
        await api.users.ban(pendingUser.id)
        toast.success('User banned successfully')
      }

      if (pendingAction === 'unban') {
        await api.users.unban(pendingUser.id)
        toast.success('User unbanned successfully')
      }

      if (pendingAction === 'delete') {
        await api.users.delete(pendingUser.id)
        toast.success('User deleted successfully')
      }

      await loadUsers()

      setConfirmBanOpen(false)
      setConfirmDeleteOpen(false)
      setPendingUser(null)
      setPendingAction(null)
    } catch (error: unknown) {
      const action = pendingAction === 'delete' ? 'delete' : 'update'
      const customMessage =
        pendingAction === 'delete'
          ? 'Failed to delete user'
          : `Failed to ${pendingAction} user`

      handleCrudError(error, action as 'delete' | 'update', 'User', {
        customMessage,
      })
    } finally {
      setConfirmLoading(false)
    }
  }

  const activeUsers = users.filter((user) => !isBanned(user)).length
  const bannedUsers = users.filter((user) => isBanned(user)).length
  const adminUsers = users.filter((user) => user.attributes.role === 'admin').length

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions
          </p>
        </div>

        <CreateUserDialog onUserCreated={loadUsers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Banned</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bannedUsers}</div>
            <p className="text-xs text-muted-foreground">Banned users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-muted-foreground">Administrator users</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>
            A list of all users in your account
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="w-[70px] pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const banned = isBanned(user)

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {getInitials(
                                user.attributes.firstName,
                                user.attributes.lastName,
                                user.attributes.email
                              )}
                            </AvatarFallback>
                          </Avatar>

                          <div>
                            <div className="font-medium">
                              {getFullName(user)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {user.id}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {user.attributes.email}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant="secondary">
                          {user.attributes.role || 'user'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusColor(banned)}
                        >
                          <span className="mr-1">
                            {getStatusIcon(banned)}
                          </span>
                          {banned ? 'Banned' : 'Active'}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {formatDate(user.attributes.created)}
                        </div>
                      </TableCell>

                      <TableCell>
                        {user.attributes.lastSignedInAt
                          ? formatDate(user.attributes.lastSignedInAt)
                          : 'Never'}
                      </TableCell>

                      <TableCell className="pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem onClick={() => handleBanUser(user)}>
                              {banned ? (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Unban User
                                </>
                              ) : (
                                <>
                                  <Ban className="mr-2 h-4 w-4" />
                                  Ban User
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm font-medium">No users found</div>
                      <div className="text-xs text-muted-foreground">
                        {searchTerm || statusFilter !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'Get started by creating your first user'}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmBanOpen}
        onOpenChange={setConfirmBanOpen}
        title={pendingAction === 'unban' ? 'Unban user?' : 'Ban user?'}
        description={
          pendingUser
            ? `${pendingAction === 'unban' ? 'Unban' : 'Ban'} ${pendingUser.attributes.email}?`
            : undefined
        }
        confirmLabel={pendingAction === 'unban' ? 'Unban' : 'Ban'}
        destructive={pendingAction === 'ban'}
        loading={confirmLoading}
        onConfirm={executePendingAction}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete user?"
        description={
          pendingUser
            ? `Delete ${pendingUser.attributes.email}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        loading={confirmLoading}
        onConfirm={executePendingAction}
      />
    </div>
  )
}
