/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the Source EULA. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
import 'vs/css!./textCell';

import { OnInit, Component, Input, Inject, forwardRef, ElementRef, ChangeDetectorRef, OnDestroy, ViewChild, OnChanges, SimpleChange } from '@angular/core';

import { CommonServiceInterface } from 'sql/services/common/commonServiceInterface.service';
import { CellView } from 'sql/parts/notebook/cellViews/interfaces';

import { IColorTheme, IWorkbenchThemeService } from 'vs/workbench/services/themes/common/workbenchThemeService';
import * as themeColors from 'vs/workbench/common/theme';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ICellModel } from 'sql/parts/notebook/models/modelInterfaces';
import { ISanitizer, defaultSanitizer } from 'sql/parts/notebook/outputs/sanitizer';
import { localize } from 'vs/nls';
import { NotebookModel } from 'sql/parts/notebook/models/notebookModel';
import { Action } from 'vs/base/common/actions';
import { ActionBar, ActionsOrientation } from 'vs/base/browser/ui/actionbar/actionbar';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { DeleteCellAction, AddCellAction } from 'sql/parts/notebook/cellViews/codeActions';
import { CellTypes } from 'sql/parts/notebook/models/contracts';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ToggleMoreWidgetAction } from 'sql/parts/dashboard/common/actions';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';

export const TEXT_SELECTOR: string = 'text-cell-component';

@Component({
	selector: TEXT_SELECTOR,
	templateUrl: decodeURI(require.toUrl('./textCell.component.html'))
})
export class TextCellComponent extends CellView implements OnInit, OnChanges {
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
	private isEditMode: boolean;
	private _sanitizer: ISanitizer;
	private _model: NotebookModel;
	private _activeCellId: string;
	private _actions: Action[] = [];
	private _moreActions: ActionBar;

	constructor(
		@Inject(forwardRef(() => CommonServiceInterface)) private _bootstrapService: CommonServiceInterface,
		@Inject(forwardRef(() => ChangeDetectorRef)) private _changeRef: ChangeDetectorRef,
		@Inject(IWorkbenchThemeService) private themeService: IWorkbenchThemeService,
		@Inject(ICommandService) private _commandService: ICommandService,
		@Inject(IInstantiationService) private _instantiationService: IInstantiationService,
		@Inject(IContextMenuService) private contextMenuService: IContextMenuService,
		@Inject(INotificationService) private notificationService: INotificationService
	) {
		super();
		this.isEditMode = false;
	}
	ngAfterViewInit() {
		this._actions.push(
			this._instantiationService.createInstance(AddCellAction, 'codeBefore', localize('codeBefore', 'Insert Code before'), CellTypes.Code, false, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'codeBefore', localize('codeAfter', 'Insert Code after'), CellTypes.Code, true, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'markdownBefore', localize('markdownBefore', 'Insert Markdown before'), CellTypes.Markdown, false, this.notificationService),
			this._instantiationService.createInstance(AddCellAction, 'markdownAfter', localize('markdownAfter', 'Insert Markdown after'), CellTypes.Markdown, true, this.notificationService),
			this._instantiationService.createInstance(DeleteCellAction, 'delete', localize('delete', 'Delete'), CellTypes.Code, true, this.notificationService)
		);
		let moreActionsElement = <HTMLElement>this.moreactionsElement.nativeElement;
		this._moreActions = new ActionBar(moreActionsElement, { orientation: ActionsOrientation.VERTICAL });
		this._moreActions.context = { target: moreActionsElement };
	}
	get activeCellId(): string {
		return this._activeCellId;
	}

	get model(): NotebookModel {
		return this._model;
	}

	ngOnChanges(changes: { [propKey: string]: SimpleChange }) {
		this.updatePreview();
		for (let propName in changes) {
			if (propName === 'activeCellId') {
				let changedProp = changes[propName];
				if (changedProp.currentValue !== undefined) {
					if (this.cellModel.id === changedProp.currentValue) {
						this.toggleMoreActions(true);
					}
					else {
						this.toggleMoreActions(false);
					}
				}
			}
		}
	}

	private toggleMoreActions(showIcon: boolean) {
		if (showIcon) {
			this._moreActions.push(this._instantiationService.createInstance(ToggleMoreWidgetAction, this._actions, this.model, this.contextMenuService), { icon: showIcon, label: false });
		} else if (this._moreActions !== undefined) {
			this._moreActions.clear();
		}
	}

	//Gets sanitizer from ISanitizer interface
	private get sanitizer(): ISanitizer {
		if (this._sanitizer) {
			return this._sanitizer;
		}
		return this._sanitizer = defaultSanitizer;
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

	//Sanitizes the content based on trusted mode of Cell Model
	private sanitizeContent(content: string): string {
		if (this.cellModel && !this.cellModel.trustedMode) {
			content = this.sanitizer.sanitize(content);
		}
		return content;
	}

	ngOnInit() {
		this.updatePreview();
		this._register(this.themeService.onDidColorThemeChange(this.updateTheme, this));
		this.updateTheme(this.themeService.getColorTheme());
		this.cellModel.onOutputsChanged(e => {
			this.updatePreview();
		});
	}

	// Todo: implement layout
	public layout() {
	}

	private updateTheme(theme: IColorTheme): void {
		let outputElement = <HTMLElement>this.output.nativeElement;
		outputElement.style.borderTopColor = theme.getColor(themeColors.SIDE_BAR_BACKGROUND, true).toString();
	}

	public handleContentChanged(): void {
		this.updatePreview();
	}

	public toggleEditMode(): void {
		this.isEditMode = !this.isEditMode;
		this.updatePreview();
		this._changeRef.detectChanges();
	}
}
