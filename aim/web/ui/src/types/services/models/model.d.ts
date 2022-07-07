import { INotification } from 'types/components/NotificationContainer/NotificationContainer';
import { ITableColumn } from 'types/pages/metrics/components/TableColumns/TableColumns';

export type State = {
  config?: Record<string, any>;
  table?: Record<string, any>;
  groupingSelectOptions?: Record<string, any>[];
  tableColumns?: ITableColumn[] | Record<string, any>[];
  data?: Record<string, any>[];
  rawData?: Record<string, any>[];
  notifyData?: INotification[];
  refs?: Record<string, any>;
  params?: Record<string, any>;
  sameValueColumns?: string[];
  selectedRows?: any;
  selectFormData?: any;
};

export interface IModel<StateType extends Partial<State>> {
  init: () => void;
  destroy: () => void;
  getState: () => StateType;
  setState: (data: Partial<StateType> | StateType | unknown | any) => void;
  emit: (
    evt: string,
    data: Partial<StateType> | StateType | unknown | any,
  ) => void;
  subscribe: (
    evt: string,
    fn: (data: StateType) => void,
  ) => { unsubscribe: () => void };
}
