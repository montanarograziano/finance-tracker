import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRecurringRules } from '../data/hooks'
import { supabase } from '../lib/supabase'
import { runRecurringEngine } from './recurringEngine'

export function useRecurringEngine(): void {
  const queryClient = useQueryClient()
  const { data: rules = [] } = useRecurringRules()
  const activeRuleIds = rules
    .filter((rule) => rule.active)
    .map((rule) => rule.id)
    .sort()
    .join(',')

  useEffect(() => {
    if (!activeRuleIds) return
    runRecurringEngine(supabase)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
        queryClient.invalidateQueries({ queryKey: ['account_balances'] })
        queryClient.invalidateQueries({ queryKey: ['net_worth_series'] })
        queryClient.invalidateQueries({ queryKey: ['recurring_rules'] })
      })
      .catch(console.error)
  }, [activeRuleIds, queryClient])
}
