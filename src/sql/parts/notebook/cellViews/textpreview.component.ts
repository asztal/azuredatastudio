/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the Source EULA. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
import 'vs/css!./code';

import { OnInit, Component, Input, Inject, forwardRef, ElementRef, ChangeDetectorRef, OnDestroy, ViewChild, Output, EventEmitter, OnChanges, SimpleChange } from '@angular/core';

import { CommonServiceInterface } from 'sql/services/common/commonServiceInterface.service';
import { AngularDisposable } from 'sql/base/common/lifecycle';
import { QueryTextEditor } from 'sql/parts/modelComponents/queryTextEditor';

import { IColorTheme, IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import * as themeColors from 'vs/workbench/common/theme';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { SimpleProgressService } from 'vs/editor/standalone/browser/simpleServices';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITextModel } from 'vs/editor/common/model';
import { UntitledEditorInput } from 'vs/workbench/common/editor/untitledEditorInput';
import URI from 'vs/base/common/uri';
import { localize } from 'vs/nls';
import { Action } from 'vs/base/common/actions';
import { ActionBar, ActionsOrientation } from 'vs/base/browser/ui/actionbar/actionbar';
import { Schemas } from 'vs/base/common/network';
import * as DOM from 'vs/base/browser/dom';
import { ICellModel } from 'sql/parts/notebook/models/modelInterfaces';
import { Taskbar } from 'sql/base/browser/ui/taskbar/taskbar';
import { RunCellAction, DeleteCellAction, AddCellAction } from 'sql/parts/notebook/cellViews/codeActions';
import { NotebookModel } from 'sql/parts/notebook/models/notebookModel';
import { ToggleMoreWidgetAction } from 'sql/parts/dashboard/common/actions';
import { CellTypes } from 'sql/parts/notebook/models/contracts';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ISanitizer, defaultSanitizer } from 'sql/parts/notebook/outputs/sanitizer';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';

export const CODE_SELECTOR: string = 'text-component';

@Component({
	selector: CODE_SELECTOR,
	templateUrl: decodeURI(require.toUrl('./text.component.html'))
})
export class TextPreviewComponent extends AngularDisposable implements OnInit, OnChanges {
	@ViewChild('preview', { read: ElementRef }) private output: ElementRef;
	@ViewChild('moreactions', { read: ElementRef }) private moreactionsElement: ElementRef;
	@Input() cellModel: ICellModel;
	@Input() set model(value: NotebookModel) {
		this._model = value;
	}

	@Input() set activeCellId(value: string) {
		this._activeCellId = value;
	}

	private _content: string;
	private _sanitizer: ISanitizer;
	private isEditMode: boolean;
	protected _moreActions: ActionBar;
	private _model: NotebookModel;
	private _activeCellId: string;
	private _actions: Action[] = [];

	constructor(
		@Inject(forwardRef(() => ChangeDetectorRef)) private _changeRef: ChangeDetectorRef,
		@Inject(IWorkbenchThemeService) private themeService: IWorkbenchThemeService,
		@Inject(IInstantiationService) private _instantiationService: IInstantiationService,
		@Inject(IContextMenuService) private contextMenuService: IContextMenuService,
		@Inject(ICommandService) private _commandService: ICommandService,
		@Inject(INotificationService) private notificationService: INotificationService
	) {
		super();
		this.isEditMode = false;
	}

	ngOnInit() {
		this.updatePreview();
		this._register(this.themeService.onDidColorThemeChange(this.updateTheme, this));
		this.updateTheme(this.themeService.getColorTheme());
		this.cellModel.onOutputsChanged(e => {
			this.updatePreview();
		});

		this._actions.push(this._instantiationService.createInstance(AddCellAction, 'codeBefore', localize('codeBefore', 'Insert Code before'), CellTypes.Code, false, this.notificationService));
		this._actions.push(this._instantiationService.createInstance(AddCellAction, 'codeAfter', localize('codeAfter', 'Insert Code after'), CellTypes.Code, true, this.notificationService));
		this._actions.push(this._instantiationService.createInstance(AddCellAction, 'markdownBefore', localize('markdownBefore', 'Insert Markdown before'), CellTypes.Markdown, false, this.notificationService));;
		this._actions.push(this._instantiationService.createInstance(AddCellAction, 'markdownAfter', localize('markdownAfter', 'Insert Markdown after'), CellTypes.Markdown, false, this.notificationService));
		this._actions.push(this._instantiationService.createInstance(DeleteCellAction, 'delete', localize('delete', 'delete'), CellTypes.Code, true, this.notificationService));
		this.toggleMoreAcitons(true);
	}

	ngOnChanges(changes: { [propKey: string]: SimpleChange }) {
		for (let propName in changes) {
			if (propName === 'activeCellId') {
				let changedProp = changes[propName];
				if (this.cellModel.id === changedProp.currentValue) {
					this.toggleMoreAcitons(true);
				}
				else {
					this.toggleMoreAcitons(false);
				}
				break;
			}
		}
	}

	get model(): NotebookModel {
		return this._model;
	}

	get activeCellId(): string {
		return this._activeCellId;
	}

	private toggleMoreAcitons(showIcon: boolean) {
		if (showIcon) {
			let moreActionsElement = <HTMLElement>this.moreactionsElement.nativeElement;
			this._moreActions = new ActionBar(moreActionsElement, { orientation: ActionsOrientation.VERTICAL });
			this._moreActions.context = { target: moreActionsElement };
			this._moreActions.push(this._instantiationService.createInstance(ToggleMoreWidgetAction, this._actions, this.model, this.contextMenuService), { icon: showIcon, label: false });
		} else if (this._moreActions !== undefined) {
				this._moreActions.clear();
		}
	}

		/**
	 * Updates the preview of markdown component with latest changes
	 * If content is empty and in non-edit mode, default it to 'Double-click to edit'
	 * Sanitizes the data to be shown in markdown cell
	 */
	private updatePreview() {
		if (this._content !== this.cellModel.source) {
			if (!this.cellModel.source && !this.isEditMode) {
				(<HTMLElement>this.output.nativeElement).innerHTML = localize('doubleClickEdit', 'Double-click to edit');
			} else {
				this._content = this.sanitizeContent(this.cellModel.source);
				// todo: pass in the notebook filename instead of undefined value
				this._commandService.executeCommand<string>('notebook.showPreview', undefined, this._content).then((htmlcontent) => {
					let outputElement = <HTMLElement>this.output.nativeElement;
					outputElement.innerHTML = htmlcontent;
				});
			}
		}
	}

	public handleContentChanged(): void {
		this.updatePreview();
	}

	//Gets sanitizer from ISanitizer interface
	private get sanitizer(): ISanitizer {
		if (this._sanitizer) {
			return this._sanitizer;
		}
		return this._sanitizer = defaultSanitizer;
	}

	//Sanitizes the content based on trusted mode of Cell Model
	private sanitizeContent(content: string): string {
		if (this.cellModel && !this.cellModel.trustedMode) {
			content = this.sanitizer.sanitize(content);
		}
		return content;
	}

	private updateTheme(theme: IColorTheme): void {
		let moreactionsEl = <HTMLElement>this.moreactionsElement.nativeElement;
		moreactionsEl.style.borderRightColor = theme.getColor(themeColors.SIDE_BAR_BACKGROUND, true).toString();
	}

}
