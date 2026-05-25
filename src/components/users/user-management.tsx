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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import {
  Search,
  MoreVertical,
  Users,
  UserCheck,
  Ban,
  CheckCircle,
  Trash2,
  Mail,
  Calendar,
  Loader2,
} from 'lucide-react'

import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'

export function UserManagement() {
  const api = getKeygenApi()

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

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

  const handleBanUser = async (user: User) => {
    try {
      await api.users.update(user.id, {
        metadata: {
          banned: true,
        },
      })

      toast.success('User banned successfully')
      await loadUsers()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'User')
    }
  }

  const handleUnbanUser = async (user: User) => {
    try {
      await api.users.update(user.id, {
        metadata: {
          banned: false,
        },
      })

      toast.success('User unbanned successfully')
      await loadUsers()
    } catch (error: unknown) {
      handleCrudError(error, 'update', 'User')
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Delete user "${user.attributes.email}"?`)) {
      return
    }

    try {
      await api.users.delete(user.id)

      toast.success('User deleted successfully')
      await loadUsers()
    } catch (error: unknown) {
      handleCrudError(error, 'delete', 'User')
    }
  }

  const filteredUsers = users.filter((user) => {
    const email = user.attributes.email?.toLowerCase() || ''
    const firstName = user.attributes.firstName?.toLowerCase() || ''
    const lastName = user.attributes.lastName?.toLowerCase() || ''

    const query = searchTerm.toLowerCase()

    return (
      email.includes(query) ||
      firstName.includes(query) ||
      lastName.includes(query)
    )
  })

  const getFullName = (user: User) => {
    const first = user.attributes.firstName || ''
    const last = user.attributes.lastName || ''

    const fullName = `${first} ${last}`.trim()

    return fullName || 'Unnamed User'
  }

  const isBanned = (user: User) => {
  return (user as any)?.attributes?.metadata?.banned === true
}
  }

  const getStatusBadge = (banned: boolean) => {
    return banned ? (
      <Badge variant="destructive" className="gap-1">
        <Ban className="h-3 w-3" />
        Banned
      </Badge>
    ) : (
      <Badge variant="default" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Active
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'

    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const activeUsers = users.filter((u) => !isBanned(u)).length
  const bannedUsers = users.filter((u) => isBanned(u)).length

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Users
          </h1>

          <p className="text-muted-foreground">
            Manage users and license owners
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>

            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {users.length}
            </div>

            <p className="text-xs text-muted-foreground">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Users
            </CardTitle>

            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {activeUsers}
            </div>

            <p className="text-xs text-muted-foreground">
              Non-banned users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Banned Users
            </CardTitle>

            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {bannedUsers}
            </div>

            <p className="text-xs text-muted-foreground">
              Restricted accounts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>

          <CardDescription>
            All registered users in Keygen
          </CardDescription>

          <div className="relative max-w-sm pt-4">
            <Search className="absolute left-3 top-7 h-4 w-4 text-muted-foreground" />

            <Input
              placeholder="Search users..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[70px] pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-6">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </TableCell>

                    <TableCell colSpan={4}>
                      Loading...
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const banned = isBanned(user)

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="pl-6 font-medium">
                        {getFullName(user)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />

                          <span>
                            {user.attributes.email || '-'}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(banned)}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />

                          <span>
                            {formatDate(user.attributes.created)}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>

                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              Actions
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            {banned ? (
                              <DropdownMenuItem
                                onClick={() => handleUnbanUser(user)}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Unban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleBanUser(user)}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </DropdownMenuItem>
                            )}

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
                  <TableCell
                    colSpan={5}
                    className="h-32 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />

                      <div className="text-sm font-medium">
                        No users found
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Try adjusting your search
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
