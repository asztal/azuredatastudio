/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { ExtensionContext } from 'vscode';
import { IConnectionProfile, IConnectionCompletionOptions, connection } from 'sqlops';
import { ApiWrapper } from '../../apiWrapper';

import { IAzureResourceContextService } from '../interfaces';

export class AzureResourceContextService implements IAzureResourceContextService {
	public constructor(
		context: ExtensionContext,
		apiWrapper: ApiWrapper
	) {
		this._context = context;
		this._apiWrapper = apiWrapper;
	}

	public getAbsolutePath(relativePath: string): string {
		return this._context.asAbsolutePath(relativePath);
	}

	public registerCommand(commandId: string, callback: (...args: any[]) => any, thisArg?: any): void {
		this._apiWrapper.registerCommand(commandId, callback);
	}

	public executeCommand(commandId: string, ...args: any[]): void {
		this._apiWrapper.executeCommand(commandId, args);
	}

	public openConnectionDialog(providers?: string[], initialConnectionProfile?: IConnectionProfile, connectionCompletionOptions?: IConnectionCompletionOptions): Thenable<connection.Connection> {
		return this._apiWrapper.openConnectionDialog(providers, initialConnectionProfile, connectionCompletionOptions);
	}

	public showErrorMessage(errorMessage: string): void {
		this._apiWrapper.showErrorMessage(errorMessage);
	}

	private _context: ExtensionContext = undefined;
	private _apiWrapper: ApiWrapper = undefined;
}
