/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import 'vs/css!./media/accountDialog';
import 'vs/css!sql/parts/accountManagement/common/media/accountActions';

import * as DOM from 'vs/base/browser/dom';
import { List } from 'vs/base/browser/ui/list/listWidget';
import { IPartService } from 'vs/workbench/services/part/common/partService';
import { Event, Emitter } from 'vs/base/common/event';
import { localize } from 'vs/nls';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachListStyler, attachBadgeStyler } from 'vs/platform/theme/common/styler';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { SplitView, Sizing } from 'vs/base/browser/ui/splitview/splitview';
import { ViewletPanel, IViewletPanelOptions } from 'vs/workbench/browser/parts/views/panelViewlet';
import { CountBadge } from 'vs/base/browser/ui/countBadge/countBadge';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

import * as sqlops from 'sqlops';

import { Button } from 'sql/base/browser/ui/button/button';
import { Modal } from 'sql/base/browser/ui/modal/modal';
import { attachModalDialogStyler, attachButtonStyler } from 'sql/common/theme/styler';
import { AccountViewModel } from 'sql/parts/accountManagement/accountDialog/accountViewModel';
import { AddAccountAction } from 'sql/parts/accountManagement/common/accountActions';
import { AccountListRenderer, AccountListDelegate } from 'sql/parts/accountManagement/common/accountListRenderer';
import { AccountProviderAddedEventParams, UpdateAccountListEventParams } from 'sql/services/accountManagement/eventTypes';
import { IClipboardService } from 'sql/platform/clipboard/common/clipboardService';
import * as TelemetryKeys from 'sql/common/telemetryKeys';

class AccountPanel extends ViewletPanel {
	private badge: CountBadge;
	protected badgeContainer: HTMLElement;
	private list: List<sqlops.Account>;

	constructor(
		private options: IViewletPanelOptions,
		@IThemeService private themeService: IThemeService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super({ ...(options as IViewletPanelOptions), ariaHeaderLabel: options.title }, keybindingService, contextMenuService, configurationService);
	}

	protected renderHeader(container: HTMLElement): void {
		this.renderHeaderTitle(container);
	}

	renderHeaderTitle(container: HTMLElement): void {
		super.renderHeaderTitle(container, this.options.title);

		this.badgeContainer = DOM.append(container, DOM.$('.count-badge-wrapper'));
		this.badge = new CountBadge(this.badgeContainer);
		this.disposables.push(attachBadgeStyler(this.badge, this.themeService));
	}

	protected renderBody(container: HTMLElement): void {
		this.list = new List<sqlops.Account>(container, new AccountListDelegate(AccountDialog.ACCOUNTLIST_HEIGHT), [new AccountListRenderer(this.instantiationService)]);
		this.disposables.push(this.list);
		this.disposables.push(attachListStyler(this.list, this.themeService));
	}

	protected layoutBody(size: number): void {
		this.list.layout(size);
	}

	update(accounts: sqlops.Account[]) {
		this.badge.setCount(accounts.length);
		this.list.splice(0, this.list.length, accounts);
	}

	get length(): number {
		return this.list.length;
	}
}

export interface IProviderViewUiComponent {
	view: AccountPanel;
	addAccountAction: AddAccountAction;
	index: number;
}

export class AccountDialog extends Modal {
	public static ACCOUNTLIST_HEIGHT = 77;

	public viewModel: AccountViewModel;

	// MEMBER VARIABLES ////////////////////////////////////////////////////
	private _providerViews: { [providerId: string]: IProviderViewUiComponent } = {};

	private _closeButton: Button;
	private _addAccountButton: Button;
	private _splitView: SplitView;
	private _container: HTMLElement;
	private _splitViewContainer: HTMLElement;
	private _noaccountViewContainer: HTMLElement;

	// EVENTING ////////////////////////////////////////////////////////////
	private _onAddAccountErrorEmitter: Emitter<string>;
	public get onAddAccountErrorEvent(): Event<string> { return this._onAddAccountErrorEmitter.event; }

	private _onCloseEmitter: Emitter<void>;
	public get onCloseEvent(): Event<void> { return this._onCloseEmitter.event; }

	constructor(
		@IPartService partService: IPartService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private _instantiationService: IInstantiationService,
		@IContextMenuService private _contextMenuService: IContextMenuService,
		@IKeybindingService private _keybindingService: IKeybindingService,
		@IConfigurationService private _configurationService: IConfigurationService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IClipboardService clipboardService: IClipboardService
	) {
		super(
			localize('linkedAccounts', 'Linked accounts'),
			TelemetryKeys.Accounts,
			partService,
			telemetryService,
			clipboardService,
			themeService,
			contextKeyService,
			{ hasSpinner: true }
		);

		// Setup the event emitters
		this._onAddAccountErrorEmitter = new Emitter<string>();
		this._onCloseEmitter = new Emitter<void>();

		// Create the view model and wire up the events
		this.viewModel = this._instantiationService.createInstance(AccountViewModel);
		this.viewModel.addProviderEvent(arg => { this.addProvider(arg); });
		this.viewModel.removeProviderEvent(arg => { this.removeProvider(arg); });
		this.viewModel.updateAccountListEvent(arg => { this.updateProviderAccounts(arg); });

		// Load the initial contents of the view model
		this.viewModel.initialize()
			.then(addedProviders => {
				for (let addedProvider of addedProviders) {
					this.addProvider(addedProvider);
				}
			});
	}

	// MODAL OVERRIDE METHODS //////////////////////////////////////////////
	protected layout(height?: number): void {
		// Ignore height as it's a subcomponent being laid out
		this._splitView.layout(DOM.getContentHeight(this._container));
	}

	public render() {
		super.render();
		attachModalDialogStyler(this, this._themeService);
		this._closeButton = this.addFooterButton(localize('accountDialog.close', 'Close'), () => this.close());
		this.registerListeners();
	}

	protected renderBody(container: HTMLElement) {
		this._container = container;
		this._splitViewContainer = DOM.$('div.account-view');
		DOM.append(container, this._splitViewContainer);
		this._splitView = new SplitView(this._splitViewContainer);

		this._noaccountViewContainer = DOM.$('div.no-account-view');
		let noAccountTitle = DOM.append(this._noaccountViewContainer, DOM.$('.no-account-view-label'));
		let noAccountLabel = localize('accountDialog.noAccountLabel', 'There is no linked account. Please add an account.');
		noAccountTitle.innerText = noAccountLabel;

		// Show the add account button for the first provider
		// Todo: If we have more than 1 provider, need to show all add account buttons for all providers
		let buttonSection = DOM.append(this._noaccountViewContainer, DOM.$('div.button-section'));
		this._addAccountButton = new Button(buttonSection);
		this._addAccountButton.label = localize('accountDialog.addConnection', 'Add an account');
		this._register(this._addAccountButton.onDidClick(() => {
			(<IProviderViewUiComponent>Object.values(this._providerViews)[0]).addAccountAction.run();
		}));

		DOM.append(container, this._noaccountViewContainer);
	}

	private registerListeners(): void {
		// Theme styler
		this._register(attachButtonStyler(this._closeButton, this._themeService));
		this._register(attachButtonStyler(this._addAccountButton, this._themeService));
	}

	/* Overwrite escape key behavior */
	protected onClose() {
		this.close();
	}

	/* Overwrite enter key behavior */
	protected onAccept() {
		this.close();
	}

	public close() {
		this._onCloseEmitter.fire();
		this.hide();
	}

	public open() {
		this.show();
		if (!this.isEmptyLinkedAccount()) {
			this.showSplitView();
		} else {
			this.showNoAccountContainer();
		}

	}

	private showNoAccountContainer() {
		this._splitViewContainer.hidden = true;
		this._noaccountViewContainer.hidden = false;
		this._addAccountButton.focus();
	}

	private showSplitView() {
		this._splitViewContainer.hidden = false;
		this._noaccountViewContainer.hidden = true;
	}

	private isEmptyLinkedAccount(): boolean {
		for (var providerId in this._providerViews) {
			var listView = this._providerViews[providerId].view;
			if (listView && listView.length > 0) {
				return false;
			}
		}
		return true;
	}

	public dispose(): void {
		super.dispose();
		for (let key in this._providerViews) {
			if (this._providerViews[key].addAccountAction) {
				this._providerViews[key].addAccountAction.dispose();
			}
			if (this._providerViews[key].view) {
				this._providerViews[key].view.dispose();
			}
			delete this._providerViews[key];
		}
	}

	// PRIVATE HELPERS /////////////////////////////////////////////////////
	private addProvider(newProvider: AccountProviderAddedEventParams) {
		// Skip adding the provider if it already exists
		if (this._providerViews[newProvider.addedProvider.id]) {
			return;
		}

		// Account provider doesn't exist, so add it
		// Create a scoped add account action
		let addAccountAction = this._instantiationService.createInstance(
			AddAccountAction,
			newProvider.addedProvider.id
		);
		addAccountAction.addAccountCompleteEvent(() => { this.hideSpinner(); });
		addAccountAction.addAccountErrorEvent(msg => { this._onAddAccountErrorEmitter.fire(msg); });
		addAccountAction.addAccountStartEvent(() => { this.showSpinner(); });

		let providerView = new AccountPanel(
			{
				id: 'accountpanel' + newProvider.addedProvider.id,
				title: newProvider.addedProvider.displayName
			},
			this._themeService,
			this._instantiationService,
			this._keybindingService,
			this._contextMenuService,
			this._configurationService
		);

		let index = this._splitView.length;
		// Append the list view to the split view
		this._splitView.addView(providerView, Sizing.Distribute, index);

		this._splitView.layout(DOM.getContentHeight(this._container));

		// Set the initial items of the list
		providerView.update(newProvider.initialAccounts);

		if (newProvider.initialAccounts.length > 0 && this._splitViewContainer.hidden) {
			this.showSplitView();
		}

		this.layout();

		// Store the view for the provider and action
		this._providerViews[newProvider.addedProvider.id] = {
			view: providerView,
			addAccountAction: addAccountAction,
			index
		};
	}

	private removeProvider(removedProvider: sqlops.AccountProviderMetadata) {
		// Skip removing the provider if it doesn't exist
		let providerView = this._providerViews[removedProvider.id];
		if (!providerView || !providerView.view) {
			return;
		}

		// Remove the list view from the split view
		this._splitView.removeView(providerView.index);
		this._splitView.layout(DOM.getContentHeight(this._container));

		// Remove the list view from our internal map
		delete this._providerViews[removedProvider.id];
		this.layout();
	}

	private updateProviderAccounts(args: UpdateAccountListEventParams) {
		let providerMapping = this._providerViews[args.providerId];
		if (!providerMapping || !providerMapping.view) {
			return;
		}
		providerMapping.view.update(args.accountList);

		if (args.accountList.length > 0 && this._splitViewContainer.hidden) {
			this.showSplitView();
		}

		if (this.isEmptyLinkedAccount() && this._noaccountViewContainer.hidden) {
			this.showNoAccountContainer();
		}

		this.layout();
	}
}
