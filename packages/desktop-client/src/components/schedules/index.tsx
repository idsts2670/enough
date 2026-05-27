import React, { useCallback, useMemo, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { ScheduleEntity } from '@actual-app/core/types/models';

import { Search } from '#components/common/Search';
import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { Page } from '#components/Page';
import { useSchedules } from '#hooks/useSchedules';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { ManualRecurringEntries } from './ManualRecurringEntries';
import { SchedulesTable } from './SchedulesTable';
import type { ScheduleItemAction } from './SchedulesTable';

type ScheduleView = 'scheduled' | 'manual';

export function Schedules() {
  const { t } = useTranslation();
  const location = useLocation();
  const initialView: ScheduleView =
    new URLSearchParams(location.search).get('view') === 'manual'
      ? 'manual'
      : 'scheduled';
  const [view, setView] = useState<ScheduleView>(initialView);

  const dispatch = useDispatch();
  const [filter, setFilter] = useState('');

  const onEdit = useCallback(
    (id: ScheduleEntity['id']) => {
      dispatch(
        pushModal({ modal: { name: 'schedule-edit', options: { id } } }),
      );
    },
    [dispatch],
  );

  const onAdd = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedule-edit', options: {} } }));
  }, [dispatch]);

  const onDiscover = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-discover' } }));
  }, [dispatch]);

  const onChangeUpcomingLength = useCallback(() => {
    dispatch(pushModal({ modal: { name: 'schedules-upcoming-length' } }));
  }, [dispatch]);

  const onAction = useCallback(
    async (name: ScheduleItemAction, id: ScheduleEntity['id']) => {
      switch (name) {
        case 'post-transaction':
          await send('schedule/post-transaction', { id });
          break;
        case 'post-transaction-today':
          await send('schedule/post-transaction', { id, today: true });
          break;
        case 'skip':
          await send('schedule/skip-next-date', { id });
          break;
        case 'complete':
          await send('schedule/update', {
            schedule: { id, completed: true },
          });
          break;
        case 'restart':
          await send('schedule/update', {
            schedule: { id, completed: false },
            resetNextDate: true,
          });
          break;
        case 'delete':
          await send('schedule/delete', { id });
          break;
        default:
          throw new Error(`Unknown action: ${String(name)}`);
      }
    },
    [],
  );

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const {
    isLoading: isSchedulesLoading,
    schedules,
    statuses,
  } = useSchedules({ query: schedulesQuery });

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Page header={t('Schedules')}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: '0 0 15px',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              variant={view === 'scheduled' ? 'primary' : 'normal'}
              onPress={() => setView('scheduled')}
            >
              <Trans>Scheduled transactions</Trans>
            </Button>
            <Button
              variant={view === 'manual' ? 'primary' : 'normal'}
              onPress={() => setView('manual')}
            >
              <Trans>Manual entries</Trans>
            </Button>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'flex-end',
            }}
          >
            {view === 'scheduled' && (
              <Search
                placeholder={t('Filter schedules…')}
                value={filter}
                onChange={setFilter}
              />
            )}
          </View>
        </View>

        {view === 'manual' ? (
          <ManualRecurringEntries />
        ) : (
          <>
            <SchedulesTable
              isLoading={isSchedulesLoading}
              schedules={schedules}
              filter={filter}
              statuses={statuses}
              allowCompleted
              onSelect={onEdit}
              onAction={onAction}
              style={{ backgroundColor: theme.tableBackground }}
            />

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                margin: '20px 0',
                flexShrink: 0,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: '1em',
                }}
              >
                <Button onPress={onDiscover}>
                  <Trans>Find schedules</Trans>
                </Button>
                <Button onPress={onChangeUpcomingLength}>
                  <Trans>Change upcoming length</Trans>
                </Button>
              </View>
              <Button variant="primary" onPress={onAdd}>
                <Trans>Add new schedule</Trans>
              </Button>
            </View>
          </>
        )}
      </Page>
    </ErrorBoundary>
  );
}
