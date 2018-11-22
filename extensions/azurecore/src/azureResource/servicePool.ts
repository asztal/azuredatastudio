/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import {
	IAzureResourceAccountService,
	IAzureResourceCredentialService,
	IAzureResourceSubscriptionService,
	IAzureResourceSubscriptionFilterService,
	IAzureResourceCacheService,
	IAzureResourceContextService,
	IAzureResourceLogService} from './interfaces';

export class AzureResourceServicePool {
	private constructor() { }

	public static getInstance(): AzureResourceServicePool {
		return AzureResourceServicePool._instance;
	}

	public logService: IAzureResourceLogService;
	public contextService: IAzureResourceContextService;
	public cacheService: IAzureResourceCacheService;
	public accountService: IAzureResourceAccountService;
	public credentialService: IAzureResourceCredentialService;
	public subscriptionService: IAzureResourceSubscriptionService;
	public subscriptionFilterService: IAzureResourceSubscriptionFilterService;

	private static readonly _instance = new AzureResourceServicePool();
}
