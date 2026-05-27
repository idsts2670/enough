import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import {
  bodySm,
  bodyStrong,
  caption,
  tabularFigure,
} from '@actual-app/components/typography';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';

type ManualRecurringEntry = Awaited<
  ReturnType<typeof send<'manual-recurring-entries/list'>>
>[number];

const defaultDayOfMonth = 1;

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function ManualRecurringEntries() {
  const { t } = useTranslation();
  const format = useFormat();
  const { data: categoryData } = useCategories();
  const [entries, setEntries] = useState<ManualRecurringEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('HSA contribution');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [startMonth, setStartMonth] = useState(currentMonth());
  const [endMonth, setEndMonth] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(String(defaultDayOfMonth));
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const groups = categoryData?.grouped ?? [];
    return groups.flatMap(group =>
      (group.categories ?? [])
        .filter(category => !category.hidden && !category.tombstone)
        .map(
          category =>
            [category.id, `${group.name} > ${category.name}`] as const,
        ),
    );
  }, [categoryData]);

  const hsaCategoryId = useMemo(() => {
    const futureMe = categoryData?.grouped.find(
      group => group.name.toLowerCase() === 'future me',
    );
    return futureMe?.categories?.find(
      category => category.name.toLowerCase() === 'hsa',
    )?.id;
  }, [categoryData]);

  useEffect(() => {
    if (!category && hsaCategoryId) {
      setCategory(hsaCategoryId);
    }
  }, [category, hsaCategoryId]);

  async function loadEntries() {
    setIsLoading(true);
    try {
      setEntries(await send('manual-recurring-entries/list'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadEntries();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName('HSA contribution');
    setAmount('');
    setCategory(hsaCategoryId ?? '');
    setStartMonth(currentMonth());
    setEndMonth('');
    setDayOfMonth(String(defaultDayOfMonth));
    setError(null);
  }

  function editEntry(entry: ManualRecurringEntry) {
    setEditingId(entry.id);
    setName(entry.name);
    setAmount(format.forEdit(entry.amount));
    setCategory(entry.category);
    setStartMonth(entry.startMonth);
    setEndMonth(entry.endMonth ?? '');
    setDayOfMonth(String(entry.dayOfMonth));
    setError(null);
  }

  async function saveEntry() {
    const parsedAmount = format.fromEdit(amount, null);
    const parsedDay = Number(dayOfMonth);

    if (!name.trim() || !category || !parsedAmount || parsedAmount <= 0) {
      setError(t('Name, amount, and category are required.'));
      return;
    }

    try {
      if (editingId) {
        await send('manual-recurring-entries/update', {
          id: editingId,
          name,
          amount: parsedAmount,
          category,
          startMonth,
          endMonth: endMonth || null,
          dayOfMonth: parsedDay,
        });
      } else {
        await send('manual-recurring-entries/create', {
          name,
          amount: parsedAmount,
          category,
          startMonth,
          endMonth: endMonth || null,
          dayOfMonth: parsedDay,
        });
      }

      resetForm();
      await loadEntries();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('Could not save.'));
    }
  }

  async function toggleEntry(entry: ManualRecurringEntry) {
    await send(
      entry.active
        ? 'manual-recurring-entries/pause'
        : 'manual-recurring-entries/resume',
      { id: entry.id },
    );
    await loadEntries();
  }

  async function deleteEntry(entry: ManualRecurringEntry) {
    await send('manual-recurring-entries/delete', { id: entry.id });
    await loadEntries();
    if (editingId === entry.id) {
      resetForm();
    }
  }

  const hsaMissing = categoryData && !hsaCategoryId;

  return (
    <View style={{ gap: 18 }}>
      <View
        style={{
          padding: 16,
          border: '1px solid ' + theme.cardBorder,
          borderRadius: 8,
          backgroundColor: theme.tableBackground,
          gap: 14,
        }}
      >
        <View style={{ gap: 4 }}>
          <Text style={{ ...bodyStrong, color: theme.pageText }}>
            <Trans>Manual recurring entries</Trans>
          </Text>
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            <Trans>
              Use these for monthly category activity that Plaid does not
              capture. They do not create transactions or change account
              balances.
            </Trans>
          </Text>
        </View>

        {hsaMissing && (
          <View
            style={{
              padding: 10,
              borderRadius: 6,
              backgroundColor: theme.warningBackground,
              color: theme.warningText,
            }}
          >
            <Text style={bodySm}>
              <Trans>
                Future Me &gt; HSA does not exist yet. Create that category or
                choose another category before saving an HSA contribution.
              </Trans>
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'end',
          }}
        >
          <View style={{ gap: 4, flex: '1.4 1 180px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Name</Trans>
            </Text>
            <Input value={name} onChangeValue={setName} />
          </View>
          <View style={{ gap: 4, flex: '0.8 1 120px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Amount</Trans>
            </Text>
            <Input
              inputMode="decimal"
              placeholder={format(0, 'financial')}
              value={amount}
              onChangeValue={setAmount}
            />
          </View>
          <View style={{ gap: 4, flex: '1.4 1 220px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Category</Trans>
            </Text>
            <Select
              options={categoryOptions}
              value={category}
              defaultLabel={t('Select category')}
              onChange={setCategory}
            />
          </View>
          <View style={{ gap: 4, flex: '0.7 1 110px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Start month</Trans>
            </Text>
            <Input value={startMonth} onChangeValue={setStartMonth} />
          </View>
          <View style={{ gap: 4, flex: '0.7 1 110px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>End month</Trans>
            </Text>
            <Input
              placeholder={t('Optional')}
              value={endMonth}
              onChangeValue={setEndMonth}
            />
          </View>
          <View style={{ gap: 4, flex: '0.5 1 90px', minWidth: 0 }}>
            <Text style={{ ...caption, color: theme.pageTextSubdued }}>
              <Trans>Day</Trans>
            </Text>
            <Input
              inputMode="numeric"
              value={dayOfMonth}
              onChangeValue={setDayOfMonth}
            />
          </View>
          <Button
            variant="primary"
            style={{ flex: '0 0 auto' }}
            onPress={saveEntry}
          >
            {editingId ? <Trans>Save</Trans> : <Trans>Add</Trans>}
          </Button>
        </View>

        {error && (
          <Text style={{ ...bodySm, color: theme.errorText }}>{error}</Text>
        )}
      </View>

      <View style={{ gap: 8 }}>
        {isLoading ? (
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            <Trans>Loading manual entries...</Trans>
          </Text>
        ) : entries.length === 0 ? (
          <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
            <Trans>No manual recurring entries yet.</Trans>
          </Text>
        ) : (
          entries.map(entry => {
            const label =
              categoryOptions.find(([id]) => id === entry.category)?.[1] ??
              t('Missing category');

            return (
              <View
                key={entry.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(180px, 1.4fr) minmax(120px, 0.8fr) minmax(220px, 1.4fr) minmax(120px, 0.8fr) auto',
                  gap: 10,
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 8,
                  backgroundColor: theme.tableRowBackgroundHover,
                }}
              >
                <View style={{ gap: 2 }}>
                  <Text style={{ ...bodyStrong, color: theme.pageText }}>
                    {entry.name}
                  </Text>
                  <Text style={{ ...caption, color: theme.pageTextSubdued }}>
                    {entry.active ? (
                      <Trans>Active</Trans>
                    ) : (
                      <Trans>Paused</Trans>
                    )}
                  </Text>
                </View>
                <Text
                  style={{
                    ...bodyStrong,
                    ...tabularFigure,
                    color: theme.pageText,
                  }}
                >
                  {format(entry.amount, 'financial')}
                </Text>
                <Text style={{ ...bodySm, color: theme.pageText }}>
                  {label}
                </Text>
                <Text style={{ ...bodySm, color: theme.pageTextSubdued }}>
                  {entry.endMonth
                    ? t('Monthly from {{startMonth}} through {{endMonth}}', {
                        startMonth: entry.startMonth,
                        endMonth: entry.endMonth,
                      })
                    : t('Monthly from {{month}}', {
                        month: entry.startMonth,
                      })}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button variant="normal" onPress={() => editEntry(entry)}>
                    <Trans>Edit</Trans>
                  </Button>
                  <Button variant="normal" onPress={() => toggleEntry(entry)}>
                    {entry.active ? (
                      <Trans>Pause</Trans>
                    ) : (
                      <Trans>Resume</Trans>
                    )}
                  </Button>
                  <Button variant="bare" onPress={() => deleteEntry(entry)}>
                    <Trans>Delete</Trans>
                  </Button>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}
