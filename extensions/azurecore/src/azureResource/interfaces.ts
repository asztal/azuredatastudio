/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { ServiceClientCredentials } from 'ms-rest';
import { Account, DidChangeAccountsParams, IConnectionProfile, IConnectionCompletionOptions, connection, AzureResourceSubscription } from 'sqlops';
import { Event } from 'vscode';

export interface IAzureResourceLogService {
    logInfo(info: string);

    logError(error: any);
}

export interface IAzureResourceAccountService {
	getAccounts(): Promise<Account[]>;

	readonly onDidChangeAccounts: Event<DidChangeAccountsParams>;
}

export interface IAzureResourceCredentialService {
	getCredentials(account: Account): Promise<ServiceClientCredentials[]>;

	getCredential(account: Account, tenantId: string): Promise<ServiceClientCredentials>;
}

export interface IAzureResourceSubscriptionService {
	getSubscriptions(account: Account, credentials: ServiceClientCredentials[]): Promise<AzureResourceSubscription[]>;
}

export interface IAzureResourceSubscriptionFilterService {
	getSelectedSubscriptions(account: Account): Promise<AzureResourceSubscription[]>;

	saveSelectedSubscriptions(account: Account, selectedSubscriptions: AzureResourceSubscription[]): Promise<void>;
}

export interface IAzureResourceCacheService {
	generateKey(id: string): string;

	get<T>(key: string): T | undefined;

	update<T>(key: string, value: T): void;
}

export interface IAzureResourceContextService {
	getAbsolutePath(relativePath: string): string;

	registerCommand(commandId: string, callback: (...args: any[]) => any, thisArg?: any): void;

	executeCommand(commandId: string, ...args: any[]): void;

	openConnectionDialog(providers?: string[], initialConnectionProfile?: IConnectionProfile, connectionCompletionOptions?: IConnectionCompletionOptions): Thenable<connection.Connection>;

	showErrorMessage(errorMessage: string): void;
}

