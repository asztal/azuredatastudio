/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureResourceProvider, AzureResourceNode, Account, IConnectionProfile, AzureResourceSubscription, AzureResourceCommand } from 'sqlops';

import { IAzureResourceDatabaseService } from './interfaces';
import { AzureResourceDatabase } from './models';
import { IAzureResourceContextService } from '../../interfaces';
import { generateGuid } from '../../utils';

export class AzureResourceDatabaseProvider implements IAzureResourceProvider {
	public constructor(
		public databaseService: IAzureResourceDatabaseService,
		public contextService: IAzureResourceContextService
	) {
	}

	public async getCommands(): Promise<AzureResourceCommand[]> {
		const commands: AzureResourceCommand[] = [];

		commands.push({
			id: 'azure.resource.connectsqldb',
			callback: async (node?: any) => {
				if (!node.itemType || node.itemType !== AzureResourceDatabaseProvider.databaseItemType || !node.itemValue) {
					return;
				}

				const database = node.itemValue;

				const connectionProfile: IConnectionProfile = {
					id: generateGuid(),
					connectionName: `connection to '${database.name}' on '${database.serverFullName}'`,
					serverName: database.serverFullName,
					databaseName: database.name,
					userName: database.loginName,
					password: '',
					authenticationType: 'SqlLogin',
					savePassword: true,
					groupFullName: '',
					groupId: '',
					providerName: 'MSSQL',
					saveProfile: true,
					options: {
					}
				};

				const conn = await this.contextService.openConnectionDialog(undefined, connectionProfile, { saveConnection: true, showDashboard: true });
				if (conn) {
					this.contextService.executeCommand('workbench.view.connections');
				}
			}
		});

		return commands;
	}

	public async getRootNode(account: Account, subscription: AzureResourceSubscription, credential: any): Promise<AzureResourceNode> {
		return {
			id: 'databaseContainer',
			label: 'SQL Databases',
			nodePath: 'databaseContainer',
			isLeaf: false,
			itemType: 'azure.resource.itemType.databaseContainer',
			itemValue: undefined,
			iconPath: {
				dark: this.contextService.getAbsolutePath('resources/dark/folder_inverse.svg'),
				light: this.contextService.getAbsolutePath('resources/light/folder.svg'),
			},
			callbacks: {
				getChildren: () => this.getChildren(account, subscription, credential)
			}
		};
	}

	public async getChildren(account: Account, subscription: AzureResourceSubscription, credential: any): Promise<AzureResourceNode[]> {
		const databases: AzureResourceDatabase[] = (await this.databaseService.getDatabases(subscription, credential)) || <AzureResourceDatabase[]>[];

		return databases.map((database) => <AzureResourceNode>{
			id: `${database.name}_on_${database.serverName}`,
			label: `${database.name} (${database.serverName})`,
			nodePath: `database_${database.name}`,
			isLeaf: true,
			itemType: AzureResourceDatabaseProvider.databaseItemType,
			itemValue: database,
			iconPath: {
				dark: this.contextService.getAbsolutePath('resources/dark/sql_database_inverse.svg'),
				light: this.contextService.getAbsolutePath('resources/light/sql_database.svg'),
			}
		});
	}

	public get providerId(): string {
		return 'azure.resource.providers.database';
	}

	private static readonly databaseItemType = 'azure.resource.itemType.database';
}