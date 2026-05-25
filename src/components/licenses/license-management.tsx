'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getKeygenApi } from '@/lib/api'
import { License } from '@/lib/types/keygen'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  Key,
  Calendar,
  Users,
  Activity,
  Pause,
  Play,
  Trash2,
  Edit,
  Copy,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { handleLoadError, handleCrudError } from '@/lib/utils/error-handling'
import { CreateLicenseDialog } from './create-license-dialog'
import { DeleteLicenseDialog } from './delete-license-dialog'
import { EditLicenseDialog } from './edit-license-dialog'

const PAGE_SIZES = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25
const SEARCH_DEBOUNCE_MS = 300

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function LicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null)

  const [licenseMachineCounts, setLicenseMachineCounts] = useState<Record<string, number>>({})
  const [licensePolicyMap, setLicensePolicyMap] = useState<Record<string, any>>({})
  const [licenseUserMap, setLicenseUserMap] = useState<Record<string, any>>({})

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)

  const [isSearchMode, setIsSearchMode] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedSearch = useDebounce(searchTerm, SEARCH_DEBOUNCE_MS)

  const api = getKeygenApi()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }

      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchTerm('')
        searchInputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const buildSearchQuery = useCallback((term: string) => {
    const query: Record<string, string> = {}

    if (term.length < 3) return query

    query.name = term

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-/i

    if (uuidPattern.test(term)) {
      query.id = term
    }

    if (term.includes('-') && /[A-F0-9]{4,}/.test(term)) {
      query.key = term
    }

    if (term.includes('@')) {
      query.user = term
    }

    return query
  }, [])

  const loadMachinesAndPolicies = useCallback(async (loadedLicenses: License[]) => {
    const machineCounts: Record<string, number> = {}
    const policyMap: Record<string, any> = {}
    const userMap: Record<string, any> = {}

    await Promise.all(
      loadedLicenses.map(async (license) => {
        // MACHINES
        try {
          const machinesResponse = await api.machines.list({
            license: license.id,
          })

          machineCounts[license.id] = machinesResponse.data?.length || 0
        } catch (err) {
          console.error(`Failed to load machines for license ${license.id}`, err)
          machineCounts[license.id] = 0
        }

        // POLICY
        try {
          const policyData = license.relationships?.policy?.data

          const policyId =
            !Array.isArray(policyData) && policyData
              ? policyData.id
              : null

          if (policyId) {
            const policyResponse = await api.policies.get(policyId)
            policyMap[license.id] = policyResponse.data
          }
        } catch (err) {
          console.error(`Failed to load policy for license ${license.id}`, err)
        }

        // USER
        try {
          const userData = license.relationships?.user?.data

          const userId =
            !Array.isArray(userData) && userData
              ? userData.id
              : null

          if (userId) {
            const userResponse = await api.users.get(userId)
            userMap[license.id] = userResponse.data
          }
        } catch (err) {
          console.error(`Failed to load user for license ${license.id}`, err)
        }
      })
    )

    setLicenseMachineCounts(machineCounts)
    setLicensePolicyMap(policyMap)
    setLicenseUserMap(userMap)
  }, [api.machines, api.policies, api.users])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      const searchQuery = debouncedSearch
        ? buildSearchQuery(debouncedSearch)
        : null

      const hasValidSearch =
        searchQuery && Object.keys(searchQuery).length > 0

      let loadedLicenses: License[] = []

      if (hasValidSearch) {
        setIsSearchMode(true)

        const response = await api.search.search<License>({
          type: 'licenses',
          query: searchQuery,
          op: 'OR',
          page: {
            size: pageSize,
            number: currentPage,
          },
        })

        loadedLicenses = response.data || []

        setLicenses(loadedLicenses)
        setTotalCount(response.meta?.count ?? loadedLicenses.length)
      } else {
        setIsSearchMode(false)

        const response = await api.licenses.list({
          page: {
            size: pageSize,
            number: currentPage,
          },
          ...(statusFilter !== 'all' && {
            status: statusFilter as License['attributes']['status'],
          }),
        })

        loadedLicenses = response.data || []

        setLicenses(loadedLicenses)
        setTotalCount(response.meta?.count ?? loadedLicenses.length)
      }

      await loadMachinesAndPolicies(loadedLicenses)
    } catch (error: unknown) {
      handleLoadError(error, 'licenses')
    } finally {
      setLoading(false)
    }
  }, [
    api.licenses,
    api.search,
    pageSize,
    currentPage,
    statusFilter,
    debouncedSearch,
    buildSearchQuery,
    loadMachinesAndPolicies,
  ])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, pageSize, debouncedSearch])

  const displayLicenses = licenses
  const displayTotalCount = totalCount
  const totalPages = Math.ceil(totalCount / pageSize)
  const isLoading = loading

  const handleRefresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'suspended':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const totalUsage = Object.values(licenseMachineCounts)
    .reduce((acc, count) => acc + count, 0)

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Licenses
          </h1>

          <p className="text-muted-foreground">
            Manage and monitor your software licenses
          </p>
        </div>

        <CreateLicenseDialog onLicenseCreated={handleRefresh} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Licenses
            </CardTitle>

            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {totalCount}
            </div>

            <p className="text-xs text-muted-foreground">
              Total licenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Machines
            </CardTitle>

            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            <div className="text-2xl font-bold">
              {totalUsage}
            </div>

            <p className="text-xs text-muted-foreground">
              Total activated devices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>License List</CardTitle>
        </CardHeader>

        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">License Key</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Machines</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {displayLicenses.map((license) => {
                const machineCount =
                  licenseMachineCounts[license.id] || 0

                const maxMachines =
                  licensePolicyMap[license.id]?.attributes?.maxMachines

                return (
                  <TableRow key={license.id}>
                    <TableCell className="pl-6">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded font-mono">
                        {license.attributes.key.substring(0, 20)}...
                      </code>
                    </TableCell>

                    <TableCell className="font-medium">
                      {license.attributes.name || (
                        <span className="text-muted-foreground italic">
                          Unnamed
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(
                          license.attributes.status
                        )}
                      >
                        {license.attributes.status}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {licenseUserMap[license.id] ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {[
                              licenseUserMap[license.id]?.attributes?.firstName,
                              licenseUserMap[license.id]?.attributes?.lastName,
                            ]
                              .filter(Boolean)
                              .join(' ') ||
                              licenseUserMap[license.id]?.attributes?.email ||
                              'Unnamed User'}
                          </span>

                          {licenseUserMap[license.id]?.attributes?.email && (
                            <span className="text-xs text-muted-foreground">
                              {licenseUserMap[license.id].attributes.email}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          No user
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="tabular-nums">
                        {machineCount}

                        {maxMachines ? (
                          <span className="text-muted-foreground">
                            {' / '}
                            {maxMachines}
                          </span>
                        ) : ''}
                      </span>
                    </TableCell>

                    <TableCell>
                      {license.attributes.expiry
                        ? formatDate(license.attributes.expiry)
                        : (
                          <span className="text-muted-foreground">
                            Never
                          </span>
                        )}
                    </TableCell>

                    <TableCell className="text-muted-foreground">
                      {formatDate(license.attributes.created)}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
