/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/base/common/actions';
import { TPromise } from 'vs/base/common/winjs.base';
import { localize } from 'vs/nls';
import { CellType, CellTypes } from 'sql/parts/notebook/models/contracts';
import { NotebookModel } from 'sql/parts/notebook/models/notebookModel';
import { getErrorMessage } from 'sql/parts/notebook/notebookUtils';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { NOTFOUND } from 'dns';
import { NsfwWatcherService } from 'vs/workbench/services/files/node/watcher/nsfw/nsfwWatcherService';
import { ActionBar, ActionsOrientation } from 'vs/base/browser/ui/actionbar/actionbar';
import { Inject, ElementRef } from '@angular/core/src/core';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { ToggleMoreWidgetAction } from 'sql/parts/dashboard/common/actions';

let notebookMoreActionMsg = localize('notebook.failed', "Please select active cell and try again");
export class RunCellAction extends Action {
	public static ID = 'jobaction.notebookRunCell';
	public static LABEL = 'Run cell';

	constructor(
	) {
		super(RunCellAction.ID, '', 'toolbarIconRun');
		this.tooltip = localize('runCell', 'Run cell');
	}

	public run(context: any): TPromise<boolean> {
		return new TPromise<boolean>((resolve, reject) => {
			try {
				resolve(true);
			} catch (e) {
				reject(e);
			}
		});
	}
}

export class AddCellAction extends Action {
	constructor(
		id: string, label: string, private cellType: CellType, private isAfter: boolean, private notificationService: INotificationService
	) {
		super(id, label);
	}
	public run(model: NotebookModel): TPromise<boolean> {
		return new TPromise<boolean>((resolve, reject) => {
			try {
				if (!model) {
					return;
				}
				if (model.activeCell === undefined) {
					this.notificationService.notify({
						severity: Severity.Error,
						message: notebookMoreActionMsg
					});
				}
				else {
					let index = model.cells.findIndex((cell) => cell.id === model.activeCell.id);
					if (index !== undefined && this.isAfter) {
						index += 1;
					}
					model.addCell(this.cellType, index);
				}
			} catch (error) {
				let message = getErrorMessage(error);

				this.notificationService.notify({
					severity: Severity.Error,
					message: message
				});
			}
		});
	}
}

export class DeleteCellAction extends Action {
	constructor(
		id: string, label: string, private cellType: CellType, private isAfter: boolean, private notificationService: INotificationService
	) {
		super(id, label);
	}
	public run(model: NotebookModel): TPromise<boolean> {
		return new TPromise<boolean>((resolve, reject) => {
			try {
				if (!model) {
					return;
				}
				if (model.activeCell === undefined) {
					this.notificationService.notify({
						severity: Severity.Error,
						message: notebookMoreActionMsg
					});
				}
				else {
					model.deleteCell(model.activeCell);
				}
			} catch (error) {
				let message = getErrorMessage(error);

				this.notificationService.notify({
					severity: Severity.Error,
					message: message
				});
			}
		});
	}
}

export class NotebookCellToggleMoreActon {
	private _actions: Action[] = [];
	private _moreActions: ActionBar;
	constructor (
		private _instantiationService: IInstantiationService,
		private contextMenuService: IContextMenuService,
		private notificationService: INotificationService,
		private moreActionElementRef: ElementRef,
		private model: NotebookModel
	) {
		this._actions.push(
			this._instantiationService.createInstance(AddCellAction, 'codeBefore', localize('codeBefore', 'Insert Code before'), CellTypes.Code, false, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'codeBefore', localize('codeAfter', 'Insert Code after'), CellTypes.Code, true, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'markdownBefore', localize('markdownBefore', 'Insert Markdown before'), CellTypes.Markdown, false, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'markdownAfter', localize('markdownAfter', 'Insert Markdown after'), CellTypes.Markdown, true, this.notificationService),
			this._instantiationService.createInstance(DeleteCellAction, 'delete', localize('delete', 'Delete'), CellTypes.Code, true, this.notificationService)
		);
		let moreActionsElement = <HTMLElement>this.moreActionElementRef.nativeElement;
		this._moreActions = new ActionBar(moreActionsElement, { orientation: ActionsOrientation.VERTICAL });
		this._moreActions.context = { target: moreActionsElement };
	}

	public toggle(showIcon: boolean) {
		if (showIcon) {
			this._moreActions.push(this._instantiationService.createInstance(ToggleMoreWidgetAction, this._actions, this.model, this.contextMenuService), { icon: showIcon, label: false });
		} else if (this._moreActions !== undefined) {
			this._moreActions.clear();
		}
	}
}