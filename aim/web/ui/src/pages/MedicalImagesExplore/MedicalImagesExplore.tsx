/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState,useRef } from 'react';
import { useHistory, useRouteMatch } from 'react-router-dom';
import _ from 'lodash-es';
import classNames from 'classnames';
import { useResizeObserver, useModel, usePanelResize } from 'hooks';
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader';
import NotificationContainer from 'components/NotificationContainer/NotificationContainer';
import Table from 'components/Table/Table';
import ResizePanel from 'components/ResizePanel/ResizePanel';
import MediaPanel from 'components/MediaPanel';
import { MediaTypeEnum } from 'components/MediaPanel/config';
import Grouping from 'components/Grouping/Grouping';
import ErrorBoundary from 'components/ErrorBoundary/ErrorBoundary';
import RangePanel from 'components/RangePanel';
import ProgressBar from 'components/ProgressBar/ProgressBar';
import IllustrationBlock from 'components/IllustrationBlock/IllustrationBlock';

import pageTitlesEnum from 'config/pageTitles/pageTitles';
import { ResizeModeEnum } from 'config/enums/tableEnums';
import { RowHeightSize } from 'config/table/tableConfigs';
import GroupingPopovers, {
  GroupNameEnum,
} from 'config/grouping/GroupingPopovers';
import { RequestStatusEnum } from 'config/enums/requestStatusEnum';
import {
  IllustrationsEnum,
  Request_Illustrations,
} from 'config/illustrationConfig/illustrationConfig';
import { ANALYTICS_EVENT_KEYS } from 'config/analytics/analyticsKeysMap';

import SelectForm from 'pages/MedicalImagesExplore/components/SelectForm/SelectForm';
import Controls from 'pages/MedicalImagesExplore/components/Controls/Controls';

import medicalImagesExploreAppModel from 'services/models/medicalImagesExplore/medicalImagesExploreAppModel';
import * as analytics from 'services/analytics';
import { AppNameEnum } from 'services/models/explorer';

import { IGroupingSelectOption } from 'types/services/models/metrics/metricsAppModel';
import { IApiRequest } from 'types/services/services';
import { IModel, State } from 'types/services/models/model';

import exceptionHandler from 'utils/app/exceptionHandler';
import getStateFromUrl from 'utils/getStateFromUrl';
import { ChartTypeEnum } from 'utils/d3';
import { SortField, SortFields } from 'utils/getSortedFields';

import MedicalImagesExploreAppBar from './components/MedicalImagesExploreAppBar/MedicalImagesExploreAppBar';
import {   Reader,
  View,
  VolumeController,
  VolumeRepresentation } from 'react-vtk-js';
import './MedicalImagesExplore.scss';

function ImagesExplore(): React.FunctionComponentElement<React.ReactNode> {
  const route = useRouteMatch<any>();
  const history = useHistory();
  const imagesExploreData = useModel<any>(medicalImagesExploreAppModel);
  const imagesWrapperRef = React.useRef<any>(null);
  const tableElemRef = React.useRef<HTMLDivElement>(null);
  const wrapperElemRef = React.useRef<HTMLDivElement>(null);
  const resizeElemRef = React.useRef<HTMLDivElement>(null);
  const view = React.useRef();
  const [offsetHeight, setOffsetHeight] = useState(
    imagesWrapperRef?.current?.offsetHeight,
  );
  const [isProgressBarVisible, setIsProgressBarVisible] =
    React.useState<boolean>(false);
  const imagesRequestRef = React.useRef<any>(null);

  const [offsetWidth, setOffsetWidth] = useState(
    imagesWrapperRef?.current?.offsetWidth,
  );

  function handleSearch() {
    analytics.trackEvent(
      ANALYTICS_EVENT_KEYS.images.imagesPanel.clickApplyButton,
    );
    imagesRequestRef.current = medicalImagesExploreAppModel.getImagesData(true);
    imagesRequestRef.current.call();
  }

  useResizeObserver(() => {
    if (imagesWrapperRef?.current?.offsetHeight !== offsetHeight) {
      setOffsetHeight(imagesWrapperRef?.current?.offsetHeight);
    }
    if (imagesWrapperRef?.current?.offsetWidth !== offsetWidth) {
      setOffsetWidth(imagesWrapperRef?.current?.offsetWidth);
    }
  }, imagesWrapperRef);

  React.useEffect(() => {
    setOffsetWidth(imagesWrapperRef?.current?.offsetWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesWrapperRef?.current?.offsetWidth]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const memoizedImagesSortFields = React.useMemo(() => {
    if (_.isEmpty(imagesExploreData?.groupingSelectOptions)) {
      return { sortFieldsDict: {}, sortFields: [] };
    }
    const grouping = imagesExploreData?.config?.grouping;
    const group: string[] = [...(grouping?.row || [])];
    //ToDo reverse mode
    const groupFields =
      // grouping?.reverseMode?.row
      //   ? imagesExploreData?.groupingSelectOptions.filter(
      //       (option: IGroupingSelectOption) => !group.includes(option.value),
      //     )
      //   :
      imagesExploreData?.groupingSelectOptions.filter(
        (option: IGroupingSelectOption) => group.includes(option.value),
      );
    let sortGroupFields = groupFields.reduce(
      (acc: SortFields, field: SortField) => {
        const resultField = imagesExploreData?.config?.images?.sortFieldsDict[
          field.value
        ] || { ...field, order: 'asc' };
        acc.push({ ...resultField, readonly: true });
        return acc;
      },
      [],
    );
    sortGroupFields = sortGroupFields.concat(
      imagesExploreData?.config?.images?.sortFields
        .filter((field: SortField) => {
          //ToDo reverse mode

          // if (grouping?.reverseMode?.row) {
          //   return group.includes(field.value);
          // } else {
          return !group.includes(field.value);
          // }
        })
        .map((field: SortField) => ({ ...field, readonly: false })),
    );

    return {
      sortFieldsDict: sortGroupFields.reduce(
        (acc: { [key: string]: SortField }, field: SortField) => {
          acc[field.value] = field;
          return acc;
        },
        {},
      ),
      sortFields: sortGroupFields,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    imagesExploreData?.config?.grouping,
    imagesExploreData?.config?.images?.sortFields,
    imagesExploreData?.groupingSelectOptions,
  ]);

  const panelResizing = usePanelResize(
    wrapperElemRef,
    imagesWrapperRef,
    tableElemRef,
    resizeElemRef,
    imagesExploreData?.config?.table || {},
    medicalImagesExploreAppModel.onTableResizeEnd,
  );

  React.useEffect(() => {
    medicalImagesExploreAppModel.initialize(route.params.appId);
    let appRequestRef: IApiRequest<void>;
    let imagesRequestRef: IApiRequest<void>;
    if (route.params.appId) {
      appRequestRef = medicalImagesExploreAppModel.getAppConfigData(
        route.params.appId,
      );
      appRequestRef
        .call((detail: any) => {
          exceptionHandler({
            detail,
            model: medicalImagesExploreAppModel as IModel<State>,
          });
        })
        .then(() => {
          medicalImagesExploreAppModel.setDefaultAppConfigData(false);
          imagesRequestRef = medicalImagesExploreAppModel.getImagesData();
          imagesRequestRef.call((detail: any) => {
            exceptionHandler({
              detail,
              model: medicalImagesExploreAppModel,
            });
          });
        });
    } else {
      medicalImagesExploreAppModel.setDefaultAppConfigData();
      imagesRequestRef = medicalImagesExploreAppModel.getImagesData();
      imagesRequestRef.call((detail: any) => {
        exceptionHandler({ detail, model: medicalImagesExploreAppModel });
      });
    }

    analytics.pageView(ANALYTICS_EVENT_KEYS.images.pageView);

    const unListenHistory = history.listen(() => {
      if (!!imagesExploreData?.config) {
        if (
          (imagesExploreData.config.grouping !== getStateFromUrl('grouping') ||
            imagesExploreData.config.images !== getStateFromUrl('images') ||
            imagesExploreData.config.select !== getStateFromUrl('select')) &&
          history.location.pathname === `/${AppNameEnum.IMAGES}`
        ) {
          medicalImagesExploreAppModel.setDefaultAppConfigData();
          medicalImagesExploreAppModel.updateModelData();
        }
      }
    });
    return () => {
      medicalImagesExploreAppModel.destroy();
      imagesRequestRef?.abort();
      unListenHistory();
      if (appRequestRef) {
        appRequestRef.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <div className='ImagesExplore__container' ref={wrapperElemRef}>
        <section className='ImagesExplore__section'>
          <div className='ImagesExplore__section__appBarContainer ImagesExplore__fullHeight'>
            <MedicalImagesExploreAppBar
              disabled={isProgressBarVisible}
              onBookmarkCreate={medicalImagesExploreAppModel.onBookmarkCreate}
              onBookmarkUpdate={medicalImagesExploreAppModel.onBookmarkUpdate}
              onResetConfigData={medicalImagesExploreAppModel.onResetConfigData}
              title={pageTitlesEnum.MEDICAL_EXPLORER}
            />
            <div className='ImagesExplore__SelectForm__Grouping__container'>
              <SelectForm
                isDisabled={isProgressBarVisible}
                requestIsPending={
                  imagesExploreData?.requestStatus === RequestStatusEnum.Pending
                }
                selectedImagesData={imagesExploreData?.config?.select}
                selectFormData={imagesExploreData?.selectFormData}
                onImagesExploreSelectChange={
                  medicalImagesExploreAppModel.onImagesExploreSelectChange
                }
                onSelectRunQueryChange={
                  medicalImagesExploreAppModel.onSelectRunQueryChange
                }
                onSelectAdvancedQueryChange={
                  medicalImagesExploreAppModel.onSelectAdvancedQueryChange
                }
                toggleSelectAdvancedMode={
                  medicalImagesExploreAppModel.toggleSelectAdvancedMode
                }
                onSearchQueryCopy={medicalImagesExploreAppModel.onSearchQueryCopy}
                searchButtonDisabled={imagesExploreData?.searchButtonDisabled}
              />
              <Grouping
                groupingPopovers={GroupingPopovers.filter(
                  (g) => g.groupName === GroupNameEnum.ROW,
                )}
                isDisabled={isProgressBarVisible}
                groupingData={imagesExploreData?.config?.grouping}
                groupingSelectOptions={imagesExploreData?.groupingSelectOptions}
                onGroupingSelectChange={
                  medicalImagesExploreAppModel.onGroupingSelectChange
                }
                onGroupingModeChange={
                  medicalImagesExploreAppModel.onGroupingModeChange
                }
                onGroupingPaletteChange={() => {}}
                onGroupingReset={() => {}}
                onGroupingApplyChange={
                  medicalImagesExploreAppModel.onGroupingApplyChange
                }
                onGroupingPersistenceChange={() => {}}
                onShuffleChange={() => {}}
              />
            </div>
            <div className='ImagesExplore__visualization'>
              <ProgressBar
                progress={imagesExploreData?.requestProgress}
                pendingStatus={
                  imagesExploreData?.requestStatus === RequestStatusEnum.Pending
                }
                processing={false}
                setIsProgressBarVisible={setIsProgressBarVisible}
              />
              {_.isEmpty(imagesExploreData?.tableData) &&
              _.isEmpty(imagesExploreData?.imagesData) ? (
                <IllustrationBlock
                  size='xLarge'
                  page='image'
                  type={
                    imagesExploreData?.selectFormData.options?.length
                      ? Request_Illustrations[
                          imagesExploreData?.requestStatus as RequestStatusEnum
                        ]
                      : IllustrationsEnum.EmptyData
                  }
                />
              ) : (
                <>
                  <div
                    ref={imagesWrapperRef}
                    className={classNames(
                      'ImagesExplore__imagesWrapper__container',
                      {
                        fullHeight:
                          imagesExploreData?.config?.table.resizeMode ===
                          ResizeModeEnum.Hide,
                        hide:
                          imagesExploreData?.config?.table.resizeMode ===
                          ResizeModeEnum.MaxHeight,
                      },
                    )}
                  >
                    {imagesExploreData?.config?.table.resizeMode ===
                    ResizeModeEnum.MaxHeight ? null : (
                      <MediaPanel
                        mediaType={MediaTypeEnum.IMAGE}
                        getBlobsData={medicalImagesExploreAppModel.getImagesBlobsData}
                        data={imagesExploreData?.imagesData}
                        orderedMap={imagesExploreData?.orderedMap}
                        isLoading={
                          imagesExploreData?.requestStatus ===
                          RequestStatusEnum.Pending
                        }
                        selectOptions={imagesExploreData?.groupingSelectOptions}
                        panelResizing={panelResizing}
                        resizeMode={imagesExploreData?.config?.table.resizeMode}
                        tableHeight={imagesExploreData?.config?.table?.height}
                        wrapperOffsetHeight={offsetHeight - 48 || 0}
                        wrapperOffsetWidth={offsetWidth || 0}
                        focusedState={
                          imagesExploreData?.config?.images?.focusedState!
                        }
                        tooltip={imagesExploreData?.tooltip!}
                        sortFieldsDict={memoizedImagesSortFields.sortFieldsDict}
                        sortFields={memoizedImagesSortFields.sortFields}
                        onRunsTagsChange={
                          medicalImagesExploreAppModel.onRunsTagsChange
                        }
                        additionalProperties={
                          imagesExploreData?.config?.images
                            ?.additionalProperties
                        }
                        illustrationConfig={{
                          page: 'image',
                          type: imagesExploreData?.selectFormData?.options
                            ?.length
                            ? Request_Illustrations[
                                imagesExploreData.requestStatus as RequestStatusEnum
                              ]
                            : IllustrationsEnum.EmptyData,
                        }}
                        onActivePointChange={
                          medicalImagesExploreAppModel.onActivePointChange
                        }
                        onChangeTooltip={medicalImagesExploreAppModel?.onChangeTooltip}
                        controls={
                          <Controls
                            selectOptions={
                              imagesExploreData?.groupingSelectOptions!
                            }
                            tooltip={imagesExploreData?.tooltip!}
                            orderedMap={imagesExploreData?.orderedMap}
                            additionalProperties={
                              imagesExploreData?.config?.images
                                ?.additionalProperties
                            }
                            sortFields={memoizedImagesSortFields.sortFields}
                            onChangeTooltip={
                              medicalImagesExploreAppModel?.onChangeTooltip
                            }
                            onImageSizeChange={
                              medicalImagesExploreAppModel.onImageSizeChange
                            }
                            onImagesSortReset={
                              medicalImagesExploreAppModel.onImagesSortReset
                            }
                            onImageRenderingChange={
                              medicalImagesExploreAppModel.onImageRenderingChange
                            }
                            onImageAlignmentChange={
                              medicalImagesExploreAppModel.onImageAlignmentChange
                            }
                            onStackingToggle={
                              medicalImagesExploreAppModel.onStackingToggle
                            }
                            onImagesSortChange={
                              medicalImagesExploreAppModel.onImagesSortChange
                            }
                          />
                        }
                        tooltipType={ChartTypeEnum.ImageSet}
                        actionPanelSize={44}
                        actionPanel={
                          imagesExploreData?.config?.images?.stepRange &&
                          imagesExploreData?.config?.images?.indexRange &&
                          medicalImagesExploreAppModel.showRangePanel() &&
                          !_.isEmpty(imagesExploreData?.imagesData) && (
                            <RangePanel
                              onApply={handleSearch}
                              applyButtonDisabled={
                                imagesExploreData?.applyButtonDisabled
                              }
                              onInputChange={
                                medicalImagesExploreAppModel.onDensityChange
                              }
                              onRangeSliderChange={
                                medicalImagesExploreAppModel.onSliceRangeChange
                              }
                              items={[
                                {
                                  inputName: 'recordDensity',
                                  inputTitle: 'Steps count',
                                  inputTitleTooltip:
                                    'Number of steps to display',
                                  inputValue:
                                    imagesExploreData?.config?.images
                                      ?.recordDensity,
                                  rangeEndpoints:
                                    imagesExploreData?.config?.images
                                      ?.stepRange,
                                  selectedRangeValue:
                                    imagesExploreData?.config?.images
                                      ?.recordSlice,
                                  sliderName: 'recordSlice',
                                  sliderTitle: 'Steps',
                                  sliderTitleTooltip:
                                    'Training step. Increments every time track() is called',
                                  sliderType: 'range',
                                  infoPropertyName: 'step',
                                },
                                {
                                  inputName: 'indexDensity',
                                  inputTitle: 'Indices count',
                                  inputTitleTooltip:
                                    'Number of images per step',
                                  inputValidationPatterns: undefined,
                                  inputValue:
                                    imagesExploreData?.config?.images
                                      ?.indexDensity,
                                  rangeEndpoints:
                                    imagesExploreData?.config?.images
                                      ?.indexRange,
                                  selectedRangeValue:
                                    imagesExploreData?.config?.images
                                      ?.indexSlice,
                                  sliderName: 'indexSlice',
                                  sliderTitle: 'Indices',
                                  sliderTitleTooltip:
                                    'Index in the list of images passed to track() call',
                                  sliderType: 'range',
                                  infoPropertyName: 'index',
                                },
                              ]}
                            />
                          )
                        }
                      />
                    )}
                  </div>
                  <ResizePanel
                    className='ImagesExplore__ResizePanel'
                    panelResizing={panelResizing}
                    resizeElemRef={resizeElemRef}
                    resizeMode={imagesExploreData?.config?.table.resizeMode}
                    onTableResizeModeChange={
                      medicalImagesExploreAppModel.onTableResizeModeChange
                    }
                  />
                  <div
                    ref={tableElemRef}
                    className={classNames('ImagesExplore__table__container', {
                      fullHeight:
                        imagesExploreData?.config?.table.resizeMode ===
                        ResizeModeEnum.MaxHeight,
                      hide:
                        imagesExploreData?.config?.table.resizeMode ===
                        ResizeModeEnum.Hide,
                    })}
                  >
                    {imagesExploreData?.config?.table.resizeMode ===
                    ResizeModeEnum.Hide ? null : (
                      <ErrorBoundary>
                        <Table
                          // deletable
                          custom
                          ref={imagesExploreData?.refs?.tableRef}
                          data={imagesExploreData?.tableData}
                          columns={imagesExploreData?.tableColumns}
                          // Table options
                          topHeader
                          groups={!Array.isArray(imagesExploreData?.tableData)}
                          rowHeight={imagesExploreData?.config?.table.rowHeight}
                          rowHeightMode={
                            imagesExploreData?.config?.table.rowHeight ===
                            RowHeightSize.sm
                              ? 'small'
                              : imagesExploreData?.config?.table.rowHeight ===
                                RowHeightSize.md
                              ? 'medium'
                              : 'large'
                          }
                          focusedState={
                            imagesExploreData?.config?.images?.focusedState!
                          }
                          selectedRows={imagesExploreData?.selectedRows}
                          sortOptions={imagesExploreData?.groupingSelectOptions}
                          sortFields={
                            imagesExploreData?.config?.table.sortFields
                          }
                          hiddenRows={
                            imagesExploreData?.config?.table.hiddenMetrics
                          }
                          hiddenColumns={
                            imagesExploreData?.config?.table.hiddenColumns
                          }
                          resizeMode={
                            imagesExploreData?.config?.table.resizeMode
                          }
                          columnsWidths={
                            imagesExploreData?.config?.table.columnsWidths
                          }
                          appName={AppNameEnum.IMAGES}
                          hiddenChartRows={
                            imagesExploreData?.imagesData?.length === 0
                          }
                          columnsOrder={
                            imagesExploreData?.config?.table.columnsOrder
                          }
                          sameValueColumns={
                            imagesExploreData?.sameValueColumns!
                          }
                          // Table actions
                          onSort={medicalImagesExploreAppModel.onTableSortChange}
                          onSortReset={medicalImagesExploreAppModel.onSortReset}
                          onExport={medicalImagesExploreAppModel.onExportTableData}
                          onManageColumns={
                            medicalImagesExploreAppModel.onColumnsOrderChange
                          }
                          onColumnsVisibilityChange={
                            medicalImagesExploreAppModel.onColumnsVisibilityChange
                          }
                          onTableDiffShow={
                            medicalImagesExploreAppModel.onTableDiffShow
                          }
                          onRowHeightChange={
                            medicalImagesExploreAppModel.onRowHeightChange
                          }
                          //@TODO add hide sequence functionality
                          // onRowsChange={medicalImagesExploreAppModel.onImageVisibilityChange}
                          // onRowHover={medicalImagesExploreAppModel.onTableRowHover}
                          // onRowClick={medicalImagesExploreAppModel.onTableRowClick}
                          onTableResizeModeChange={
                            medicalImagesExploreAppModel.onTableResizeModeChange
                          }
                          updateColumnsWidths={
                            medicalImagesExploreAppModel.updateColumnsWidths
                          }
                          onRowSelect={medicalImagesExploreAppModel.onRowSelect}
                          archiveRuns={medicalImagesExploreAppModel.archiveRuns}
                          deleteRuns={medicalImagesExploreAppModel.deleteRuns}
                          multiSelect
                        />
                      </ErrorBoundary>
                    )}
                  </div>
                </>
              )}
            </div>
            <View id='0' ref={view}>
        <VolumeRepresentation>
          
          <VolumeController />
            <Reader
              vtkClass={vtkXMLImageDataReader}
              url='https://data.kitware.com/api/v1/item/59e12e988d777f31ac6455c5/download'
            />
        </VolumeRepresentation>
      </View>
          </div>
        </section>
        {imagesExploreData?.notifyData?.length > 0 && (
          <NotificationContainer
            handleClose={medicalImagesExploreAppModel.onNotificationDelete}
            data={imagesExploreData?.notifyData}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default ImagesExplore;
