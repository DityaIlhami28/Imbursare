import { AmountPolicyService } from './amount-policy.service';
export declare class AmountPolicyController {
    private readonly amountPolicyService;
    constructor(amountPolicyService: AmountPolicyService);
    getAmountPolicies(req: any): Promise<{
        id: string;
        positionLevelId: string;
        name: string;
        companyId: string;
        minAmount: number;
        maxAmount: number;
        totalTransactions: number;
    }[]>;
    addAmountPolicy(req: any, amountPolicyData: any): Promise<{
        id: string;
        positionLevelId: string;
        name: string;
        companyId: string;
        minAmount: number;
        maxAmount: number;
        totalTransactions: number;
    }>;
}
