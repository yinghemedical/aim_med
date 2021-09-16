import React from 'react';
import Table from 'components/Table/Table';
import { IRunsTableProps } from 'types/pages/runs/Runs';
import { CircularProgress } from '@material-ui/core';

function RunsTable({
  isRunsDataLoading,
  isInfiniteLoading,
  tableRef,
  columns,
  tableRowHeight,
  onExportTableData,
  getLastRunsData,
  isLatest,
  data,
  onColumnsVisibilityChange,
  onTableDiffShow,
  onManageColumns,
  onRowHeightChange,
  hiddenColumns,
  columnsOrder,
}: IRunsTableProps): React.FunctionComponentElement<React.ReactNode> {
  const getLatestRunsDataRequestRef = React.useRef<any>(null);
  React.useEffect(() => {
    return () => {
      getLatestRunsDataRequestRef.current?.abort();
    };
  }, []);

  function handleInfiniteLoad(row: any) {
    if (!isLatest && !isInfiniteLoading) {
      getLatestRunsDataRequestRef.current = getLastRunsData(row);
      getLatestRunsDataRequestRef.current?.call().catch();
    }
  }

  return (
    <div className='Runs__RunList__runListBox'>
      <div className='RunsTable'>
        <Table
          custom
          allowInfiniteLoading
          isInfiniteLoading={isInfiniteLoading}
          showRowClickBehaviour={false}
          infiniteLoadHandler={handleInfiniteLoad}
          showResizeContainerActionBar={false}
          emptyText={'No runs found'}
          ref={tableRef}
          data={data}
          columns={columns}
          isLoading={isRunsDataLoading}
          // Table options
          topHeader
          rowHeight={tableRowHeight}
          hiddenColumns={hiddenColumns}
          columnsOrder={columnsOrder}
          // Table actions
          onManageColumns={onManageColumns}
          onColumnsVisibilityChange={onColumnsVisibilityChange}
          onTableDiffShow={onTableDiffShow}
          onRowHeightChange={onRowHeightChange}
          onExport={onExportTableData}
        />
      </div>
      {isInfiniteLoading && (
        <div className='Infinite_Loader'>
          <CircularProgress />
        </div>
      )}
    </div>
  );
}

export default RunsTable;