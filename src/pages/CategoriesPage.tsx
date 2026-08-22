import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '../data/hooks'
import type { Category, CategoryType } from '../lib/types'

interface FormState {
  name: string
  type: CategoryType
  color: string
  icon: string
  parent_id: string
}

const emptyForm: FormState = {
  name: '',
  type: 'expense',
  color: '#6b7280',
  icon: '🏷️',
  parent_id: '',
}

export function CategoriesPage() {
  const { t } = useTranslation()
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)

  const parents = categories.filter((c) => c.parent_id === null)
  const childrenOf = (id: string) => categories.filter((c) => c.parent_id === id)

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  const startEdit = (category: Category) => {
    setEditingId(category.id)
    setForm({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      parent_id: category.parent_id ?? '',
    })
    setShowForm(true)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const input = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      icon: form.icon.trim() || '🏷️',
      parent_id: form.parent_id || null,
    }
    if (editingId) {
      updateCategory.mutate({ id: editingId, input })
    } else {
      createCategory.mutate(input)
    }
    setShowForm(false)
  }

  const onDelete = (category: Category) => {
    if (window.confirm(t('categories.confirmDelete', { name: category.name }))) {
      deleteCategory.mutate(category.id)
    }
  }

  const renderItem = (category: Category, indent: boolean) => (
    <li
      key={category.id}
      className={`card flex items-center justify-between p-3.5 transition-shadow hover:shadow-sm ${indent ? 'ml-6' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block h-3 w-3 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <span aria-hidden>{category.icon}</span>
        <span>{category.name}</span>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => startEdit(category)}
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {t('categories.edit')}
        </button>
        <button
          onClick={() => onDelete(category)}
          className="text-sm font-medium text-rose-600 transition-colors hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
        >
          {t('categories.delete')}
        </button>
      </div>
    </li>
  )

  const renderSection = (title: string, type: CategoryType) => (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <ul className="space-y-2">
        {parents
          .filter((c) => c.type === type)
          .flatMap((parent) => [
            renderItem(parent, false),
            ...childrenOf(parent.id).map((child) => renderItem(child, true)),
          ])}
      </ul>
    </section>
  )

  if (isLoading) return <p className="text-slate-500 dark:text-slate-400">{t('common.loading')}</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t('categories.title')}</h1>
        <button onClick={startCreate} className="btn-primary">
          {t('categories.newButton')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-3 p-5">
          <div>
            <label htmlFor="cat-name" className="form-label">
              {t('categories.name')}
            </label>
            <input
              id="cat-name"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="cat-type" className="form-label">
                {t('categories.type')}
              </label>
              <select
                id="cat-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CategoryType })}
                className="input"
              >
                <option value="expense">{t('categories.expense')}</option>
                <option value="income">{t('categories.income')}</option>
              </select>
            </div>
            <div>
              <label htmlFor="cat-color" className="form-label">
                {t('categories.color')}
              </label>
              <input
                id="cat-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-[38px] w-14 cursor-pointer rounded-xl border border-slate-300 dark:border-slate-700"
              />
            </div>
            <div className="w-20">
              <label htmlFor="cat-icon" className="form-label">
                {t('categories.icon')}
              </label>
              <input
                id="cat-icon"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cat-parent" className="form-label">
              {t('categories.parent')}
            </label>
            <select
              id="cat-parent"
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              className="input"
            >
              <option value="">{t('categories.noParent')}</option>
              {parents
                .filter((c) => c.type === form.type && c.id !== editingId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              {t('categories.save')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              {t('categories.cancel')}
            </button>
          </div>
        </form>
      )}

      {renderSection(t('categories.sectionExpense'), 'expense')}
      {renderSection(t('categories.sectionIncome'), 'income')}
    </div>
  )
}
