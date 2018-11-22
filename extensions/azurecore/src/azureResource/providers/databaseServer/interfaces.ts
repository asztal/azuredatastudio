/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import { AzureResourceSubscription } from 'sqlops';
import { ServiceClientCredentials } from 'ms-rest';

import { AzureResourceDatabaseServer } from './models';

export interface IAzureResourceDatabaseServerService {
	getDatabaseServers(subscription: AzureResourceSubscription, credential: ServiceClientCredentials): Promise<AzureResourceDatabaseServer[]>;
}