/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
import * as sqlops from 'sqlops';
import * as nls from 'vscode-nls';
import { DacFxDataModel } from '../api/models';
import { DataTierApplicationWizard, Operation } from '../DataTierApplicationWizard';
import { BasePage } from '../api/basePage';

const localize = nls.loadMessageBundle();

export class SelectPage extends BasePage {

	protected readonly wizardPage: sqlops.window.modelviewdialog.WizardPage;
	protected readonly instance: DataTierApplicationWizard;
	protected readonly model: DacFxDataModel;
	protected readonly view: sqlops.ModelView;

	private publishRadioButton: sqlops.RadioButtonComponent;
	private exportRadioButton: sqlops.RadioButtonComponent;
	private fileTypeText: sqlops.TextComponent;
	private dacpacRadioButton: sqlops.RadioButtonComponent;
	private bacpacRadioButton: sqlops.RadioButtonComponent;
	private form: sqlops.FormContainer;

	public constructor(instance: DataTierApplicationWizard, wizardPage: sqlops.window.modelviewdialog.WizardPage, model: DacFxDataModel, view: sqlops.ModelView) {
		super();
		this.instance = instance;
		this.wizardPage = wizardPage;
		this.model = model;
		this.view = view;
	}

	async start(): Promise<boolean> {
		let publishComponent = await this.createDeployRadioButton();
		let exportComponent = await this.createExportRadioButton();
		let fileTypeComponent = await this.createFileTypeText();
		let dacpacComponent = await this.createDacpacRadioButton();
		let bacpacComponent = await this.createBacpacRadioButton();

		this.form = this.view.modelBuilder.formContainer()
			.withFormItems(
				[
					publishComponent,
					exportComponent,
					fileTypeComponent,
					dacpacComponent,
					bacpacComponent
				], {
					horizontal: true
				}).component();
		await this.view.initializeModel(this.form);

		// default have the publish and dacpac radio button checked
		this.publishRadioButton.checked = true;
		this.dacpacRadioButton.checked = true;
		this.instance.setDoneButton(Operation.deploy);

		return true;
	}

	async onPageEnter(): Promise<boolean> {
		let numPages = this.instance.wizard.pages.length;
		for (let i = numPages - 1; i > 2; --i) {
			await this.instance.wizard.removePage(i);
		}

		return true;
	}

	private async createFileTypeText(): Promise<sqlops.FormComponent> {
		this.fileTypeText = this.view.modelBuilder.text()
			.withProperties({
				value: localize('dacFx.fileTypeText', 'File Type'),
			}).component();
		5
		return {
			component: this.fileTypeText,
			title: ''
		};
	}

	private async createDeployRadioButton(): Promise<sqlops.FormComponent> {
		this.publishRadioButton = this.view.modelBuilder.radioButton()
			.withProperties({
				name: 'selectedOperation',
				label: localize('dacFx.deployRadioButtonLabel', 'Publish'),
			}).component();

		this.publishRadioButton.onDidClick(() => {
			this.exportRadioButton.checked = false;
			// remove the previous page
			this.instance.wizard.removePage(1);

			// add deploy page
			console.log('pub:' + this.publishRadioButton.checked + ' ex:' + this.exportRadioButton.checked + ' dac:' + this.dacpacRadioButton.checked + ' bac:' + this.bacpacRadioButton.checked);
			let page;
			if (this.dacpacRadioButton.checked) {
				page = this.instance.pages.get('deployConfig');
				this.instance.setDoneButton(Operation.deploy);
			} else {
				page = this.instance.pages.get('importConfig');
				this.instance.setDoneButton(Operation.import);
			}
			this.instance.wizard.addPage(page.wizardPage, 1);
		});

		return {
			component: this.publishRadioButton,
			title: ''
		};
	}

	private async createExportRadioButton(): Promise<sqlops.FormComponent> {
		this.exportRadioButton = this.view.modelBuilder.radioButton()
			.withProperties({
				name: 'selectedOperation',
				label: localize('dacFx.exportRadioButtonLabel', 'Export'),
			}).component();

		this.exportRadioButton.onDidClick(() => {
			this.publishRadioButton.checked = false;

			// remove the previous pages
			this.instance.wizard.removePage(1);

			// add the extract page
			console.log('pub:' + this.publishRadioButton.checked + ' ex:' + this.exportRadioButton.checked + ' dac:' + this.dacpacRadioButton.checked + ' bac:' + this.bacpacRadioButton.checked);
			let page;
			if (this.dacpacRadioButton.checked) {
				page = this.instance.pages.get('extractConfig');
				this.instance.setDoneButton(Operation.extract);
			} else {
				page = this.instance.pages.get('exportConfig');
				this.instance.setDoneButton(Operation.export);
			}
			this.instance.wizard.addPage(page.wizardPage, 1);
		});

		return {
			component: this.exportRadioButton,
			title: ''
		};
	}

	private async createDacpacRadioButton(): Promise<sqlops.FormComponent> {
		this.dacpacRadioButton = this.view.modelBuilder.radioButton()
			.withProperties({
				name: 'selectedFileType',
				label: localize('dacFx.dacpacRadioButtonLabel', 'Dacpac'),
			}).component();

		this.dacpacRadioButton.onDidClick(() => {
			this.bacpacRadioButton.checked = false;

			// remove the previous pages
			this.instance.wizard.removePage(1);

			// add the extract page
			console.log('pub:' + this.publishRadioButton.checked + ' ex:' + this.exportRadioButton.checked + ' dac:' + this.dacpacRadioButton.checked + ' bac:' + this.bacpacRadioButton.checked);
			let page;
			if (this.publishRadioButton.checked) {
				page = this.instance.pages.get('deployConfig');
				this.instance.setDoneButton(Operation.deploy);
			} else {
				page = this.instance.pages.get('extractConfig');
				this.instance.setDoneButton(Operation.extract);
			}

			this.instance.wizard.addPage(page.wizardPage, 1);
		});

		return {
			component: this.dacpacRadioButton,
			title: ''
		};
	}

	private async createBacpacRadioButton(): Promise<sqlops.FormComponent> {
		this.bacpacRadioButton = this.view.modelBuilder.radioButton()
			.withProperties({
				name: 'selectedFileType',
				label: localize('dacFx.bacpacRadioButtonLabel', 'Bacpac'),
			}).component();

		this.bacpacRadioButton.onDidClick(() => {
			this.dacpacRadioButton.checked = false;

			// remove the previous pages
			this.instance.wizard.removePage(1);

			// add the appropriate page
			console.log('pub:' + this.publishRadioButton.checked + ' ex:' + this.exportRadioButton.checked + ' dac:' + this.dacpacRadioButton.checked + ' bac:' + this.bacpacRadioButton.checked);
			let page;
			if (this.publishRadioButton.checked) {
				page = this.instance.pages.get('importConfig');
				this.instance.setDoneButton(Operation.import);
			} else {
				page = this.instance.pages.get('exportConfig');
				this.instance.setDoneButton(Operation.export);
			}

			this.instance.wizard.addPage(page.wizardPage, 1);
		});

		return {
			component: this.bacpacRadioButton,
			title: ''
		};
	}

	public setupNavigationValidator() {
		this.instance.registerNavigationValidator(() => {
			return true;
		});
	}
}
