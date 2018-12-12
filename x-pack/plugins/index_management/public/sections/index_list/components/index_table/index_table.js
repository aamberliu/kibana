/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { Route } from 'react-router-dom';
import { NoMatch } from '../../../no_match';
import { healthToColor } from '../../../../services';

import '../../../../styles/table.less';

import {
  EuiCallOut,
  EuiHealth,
  EuiLink,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiSpacer,
  EuiSearchBar,
  EuiSwitch,
  EuiTable,
  EuiTableBody,
  EuiTableHeader,
  EuiTableHeaderCell,
  EuiTableHeaderCellCheckbox,
  EuiTablePagination,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableRowCellCheckbox,
  EuiTitle,
  EuiText,
  EuiPageBody,
  EuiPageContent,
} from '@elastic/eui';

import { IndexActionsContextMenu } from '../../components';
import { getBannerExtensions, getFilterExtensions } from '../../../../index_management_extensions';

const HEADERS = {
  name: i18n.translate('xpack.idxMgmt.indexTable.headers.nameHeader', {
    defaultMessage: 'Name',
  }),
  health: i18n.translate('xpack.idxMgmt.indexTable.headers.healthHeader', {
    defaultMessage: 'Health',
  }),
  status: i18n.translate('xpack.idxMgmt.indexTable.headers.statusHeader', {
    defaultMessage: 'Status',
  }),
  primary: i18n.translate('xpack.idxMgmt.indexTable.headers.primaryHeader', {
    defaultMessage: 'Primaries',
  }),
  replica: i18n.translate('xpack.idxMgmt.indexTable.headers.replicaHeader', {
    defaultMessage: 'Replicas',
  }),
  documents: i18n.translate('xpack.idxMgmt.indexTable.headers.documentsHeader', {
    defaultMessage: 'Docs count',
  }),
  size: i18n.translate('xpack.idxMgmt.indexTable.headers.storageSizeHeader', {
    defaultMessage: 'Storage size',
  }),
};

export class IndexTableUi extends Component {
  static getDerivedStateFromProps(props, state) {
    // Deselct any indices which no longer exist, e.g. they've been deleted.
    const { selectedIndicesMap } = state;
    const indexNames = props.indices.map(index => index.name);
    const selectedIndexNames = Object.keys(selectedIndicesMap);
    const missingIndexNames = selectedIndexNames.filter(selectedIndexName => {
      return !indexNames.includes(selectedIndexName);
    });

    if (missingIndexNames.length) {
      const newMap = { ...selectedIndicesMap };
      missingIndexNames.forEach(missingIndexName => delete newMap[missingIndexName]);
      return { selectedIndicesMap: newMap };
    }

    return null;
  }

  constructor(props) {
    super(props);

    this.state = {
      selectedIndicesMap: {},
    };
  }
  componentDidMount() {
    const {
      filterChanged,
      filterFromURI
    } = this.props;
    if (filterFromURI) {
      const decodedFilter = decodeURIComponent(filterFromURI);
      filterChanged(EuiSearchBar.Query.parse(decodedFilter));
    }
  }
  onSort = column => {
    const { sortField, isSortAscending, sortChanged } = this.props;

    const newIsSortAscending = sortField === column ? !isSortAscending : true;
    sortChanged(column, newIsSortAscending);
  };
  renderFilterError() {
    const { intl } = this.props;
    const { filterError } = this.state;
    if (!filterError) {
      return;
    }
    return (
      <Fragment>
        <EuiCallOut
          iconType="faceSad"
          color="danger"
          title={intl.formatMessage({
            id: 'xpack.idxMgmt.indexTable.invalidSearchErrorMessage',
            defaultMessage: 'Invalid search: {errorMessage}',
          }, {
            errorMessage: filterError.message
          })}
        />
        <EuiSpacer size="l"/>
      </Fragment>
    );
  }
  onFilterChanged = ({ query, error }) => {
    if (error) {
      this.setState({ filterError: error });
    } else {
      this.props.filterChanged(query);
      this.setState({ filterError: null });
    }
  }
  getFilters = () => {
    const { allIndices } = this.props;
    return getFilterExtensions().reduce((accum, filterExtension) => {
      const filtersToAdd = filterExtension(allIndices);
      return [...accum, ...filtersToAdd];
    }, []);
  }
  toggleAll = () => {
    const allSelected = this.areAllItemsSelected();
    if (allSelected) {
      return this.setState({ selectedIndicesMap: {} });
    }
    const { indices } = this.props;
    const selectedIndicesMap = {};
    indices.forEach(({ name }) => {
      selectedIndicesMap[name] = true;
    });
    this.setState({
      selectedIndicesMap,
    });
  };

  toggleItem = name => {
    this.setState(({ selectedIndicesMap }) => {
      const newMap = { ...selectedIndicesMap };
      if (newMap[name]) {
        delete newMap[name];
      } else {
        newMap[name] = true;
      }
      return {
        selectedIndicesMap: newMap,
      };
    });
  };

  isItemSelected = name => {
    return !!this.state.selectedIndicesMap[name];
  };

  areAllItemsSelected = () => {
    const { indices } = this.props;
    const indexOfUnselectedItem = indices.findIndex(index => !this.isItemSelected(index.name));
    return indexOfUnselectedItem === -1;
  };

  buildHeader() {
    const { sortField, isSortAscending } = this.props;
    return Object.entries(HEADERS).map(([fieldName, label]) => {
      const isSorted = sortField === fieldName;
      return (
        <EuiTableHeaderCell
          key={fieldName}
          onSort={() => this.onSort(fieldName)}
          isSorted={isSorted}
          isSortAscending={isSortAscending}
          data-test-subj={`indexTableHeaderCell-${fieldName}`}
          className={'indexTable__header--' + fieldName}
        >
          {label}
        </EuiTableHeaderCell>
      );
    });
  }

  buildRowCell(fieldName, value) {
    const { openDetailPanel } = this.props;
    if (fieldName === 'health') {
      return <EuiHealth color={healthToColor(value)}>{value}</EuiHealth>;
    } else if (fieldName === 'name') {
      return (
        <EuiLink
          className="indTable__link"
          data-test-subj="indexTableIndexNameLink"
          onClick={() => {
            openDetailPanel(value);
          }}
        >
          {value}
        </EuiLink>
      );
    }
    return value;
  }

  buildRowCells(index) {
    return Object.keys(HEADERS).map(fieldName => {
      const { name } = index;
      const value = index[fieldName];
      return (
        <EuiTableRowCell
          key={`${fieldName}-${name}`}
          truncateText={false}
          data-test-subj={`indexTableCell-${fieldName}`}
        >
          {this.buildRowCell(fieldName, value)}
        </EuiTableRowCell>
      );
    });
  }
  renderBanners() {
    const { allIndices = [], filterChanged } = this.props;
    return getBannerExtensions().map((bannerExtension, i) => {
      const bannerData = bannerExtension(allIndices);
      if (!bannerData) {
        return null;
      }

      const {
        type,
        title,
        message,
        filter,
        filterLabel,
      } = bannerData;

      return (
        <Fragment key={`bannerExtension${i}`}>
          <EuiCallOut
            color={type}
            size="m"
            title={title}
          >
            <EuiText>
              {message}
              {filter ? (
                <EuiLink onClick={() => filterChanged(filter)}>
                  {filterLabel}
                </EuiLink>
              ) : null}
            </EuiText>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </Fragment>
      );
    });
  }
  buildRows() {
    const { indices = [], detailPanelIndexName } = this.props;
    return indices.map(index => {
      const { name } = index;
      return (
        <EuiTableRow
          isSelected={this.isItemSelected(name) || name === detailPanelIndexName}
          key={`${name}-row`}
        >
          <EuiTableRowCellCheckbox key={`checkbox-${name}`}>
            <EuiCheckbox
              type="inList"
              id={`checkboxSelectIndex-${name}`}
              checked={this.isItemSelected(name)}
              onChange={() => {
                this.toggleItem(name);
              }}
              data-test-subj="indexTableRowCheckbox"
            />
          </EuiTableRowCellCheckbox>
          {this.buildRowCells(index)}
        </EuiTableRow>
      );
    });
  }

  renderPager() {
    const { pager, pageChanged, pageSizeChanged } = this.props;
    return (
      <EuiTablePagination
        activePage={pager.getCurrentPageIndex()}
        itemsPerPage={pager.itemsPerPage}
        itemsPerPageOptions={[10, 50, 100]}
        pageCount={pager.getTotalPages()}
        onChangeItemsPerPage={pageSizeChanged}
        onChangePage={pageChanged}
      />
    );
  }

  onItemSelectionChanged = selectedIndices => {
    this.setState({ selectedIndices });
  };

  render() {
    const {
      filter,
      showSystemIndices,
      showSystemIndicesChanged,
      indices,
      intl,
    } = this.props;
    const { selectedIndicesMap } = this.state;
    const atLeastOneItemSelected = Object.keys(selectedIndicesMap).length > 0;
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiTitle size="l">
                  <h1>
                    <FormattedMessage
                      id="xpack.idxMgmt.indexTable.sectionHeading"
                      defaultMessage="Index management"
                    />
                  </h1>
                </EuiTitle>
                <EuiSpacer size="s" />
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="xpack.idxMgmt.indexTable.sectionDescription"
                      defaultMessage="Update your Elasticsearch indices individually or in bulk."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiSwitch
                  id="checkboxShowSystemIndices"
                  checked={showSystemIndices}
                  onChange={event => showSystemIndicesChanged(event.target.checked)}
                  label={
                    <FormattedMessage
                      id="xpack.idxMgmt.indexTable.systemIndicesSwitchLabel"
                      defaultMessage="Include system indices"
                    />
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer />
            {this.renderBanners()}
            <EuiFlexGroup gutterSize="l" alignItems="center">
              {atLeastOneItemSelected ? (
                <EuiFlexItem grow={false}>
                  <Route
                    key="menu"
                    render={() => (
                      <IndexActionsContextMenu
                        indexNames={Object.keys(selectedIndicesMap)}
                        resetSelection={() => {
                          this.setState({ selectedIndicesMap: {} });
                        }}
                      />
                    )}
                  />
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem>
                <EuiSearchBar
                  filters={this.getFilters()}
                  defaultQuery={filter}
                  query={filter}
                  box={{
                    incremental: true,
                    placeholder: intl.formatMessage({
                      id: 'xpack.idxMgmt.indexTable.systemIndicesSearchInputPlaceholder',
                      defaultMessage: 'Search',
                    }) }
                  }
                  aria-label={intl.formatMessage({
                    id: 'xpack.idxMgmt.indexTable.systemIndicesSearchIndicesAriaLabel',
                    defaultMessage: 'Search indices',
                  })}
                  data-test-subj="indexTableFilterInput"

                  onChange={this.onFilterChanged}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            {this.renderFilterError()}
            <EuiSpacer size="m" />

            {indices.length > 0 ? (
              <EuiTable>
                <EuiTableHeader>
                  <EuiTableHeaderCellCheckbox>
                    <EuiCheckbox
                      id="selectAllIndexes"
                      checked={this.areAllItemsSelected()}
                      onChange={this.toggleAll}
                      type="inList"
                    />
                  </EuiTableHeaderCellCheckbox>
                  {this.buildHeader()}
                </EuiTableHeader>
                <EuiTableBody>{this.buildRows()}</EuiTableBody>
              </EuiTable>
            ) : (
              <NoMatch />
            )}
            <EuiSpacer size="m" />
            {indices.length > 0 ? this.renderPager() : null}
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const IndexTable = injectI18n(IndexTableUi);