/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Table } from './table';
import { TableDataView } from './tableDataView';
import { attachTableStyler } from 'sql/common/theme/styler';

import { $ } from 'vs/base/browser/builder';
import { StandardKeyboardEvent } from 'vs/base/browser/keyboardEvent';
import { KeyCode } from 'vs/base/common/keyCodes';
import * as DOM from 'vs/base/browser/dom';
import * as lifecycle from 'vs/base/common/lifecycle';
import { Orientation } from 'vs/base/browser/ui/splitview/splitview';
import { ViewletPanel, IViewletPanelOptions } from 'vs/workbench/browser/parts/views/panelViewlet';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { ITableConfiguration } from 'sql/base/browser/ui/table/interfaces';

export interface ITableViewOptions<T> extends IViewletPanelOptions {
	tableConfigurations?: ITableConfiguration<T>;
}

export class TableCollapsibleView<T> extends ViewletPanel {
	private _table: Table<T>;

	constructor(
		private options: ITableViewOptions<T>,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IThemeService private themeService: IThemeService
	) {
		super({ ...(options as IViewletPanelOptions), ariaHeaderLabel: options.title }, keybindingService, contextMenuService, configurationService);
	}

	protected renderBody(container: HTMLElement): void {
		this._table = new Table(container, this.options.tableConfigurations);
		this.disposables.push(this._table);
		this.disposables.push(attachTableStyler(this._table, this.themeService));
	}

	protected layoutBody(size: number): void {
		this.table.layout(size, Orientation.VERTICAL);
	}

	public get table(): Table<T> {
		return this._table;
	}
}
