export interface ReportFilter {
startDate?: string;
endDate?: string;

memberIds?: string[];
divisionIds?: string[];
campaignIds?: string[];
workspaceIds?: string[];
labelIds?: string[];
brandIds?: string[];
}

export interface SelectOption {
id: string;
name: string;
}

export interface ReportSummary {
totalTasks: number;
completedTasks: number;
overdueTasks: number;
inProgressTasks: number;
pendingTasks: number;

totalResponses: number;

completionRate: number;
}

export interface TaskReport {
id: string;

taskNumber?: string;
title: string;
description?: string;

workspaceId?: string;
workspaceName?: string;

campaignId?: string;
campaignName?: string;

brandId?: string;
brandName?: string;

assigneeId?: string;
assigneeName?: string;

divisionId?: string;
divisionName?: string;

labels?: {
id: string;
name: string;
}[];

priority?: string;

status: string;

startDate?: string;
dueDate?: string;
completedAt?: string;

createdAt: string;
updatedAt: string;
}

export interface ResponseReport {
id: string;

formId: string;
formName: string;

submittedById: string;
submittedByName: string;

divisionId?: string;
divisionName?: string;

campaignId?: string;
campaignName?: string;

workspaceId?: string;
workspaceName?: string;

submittedAt: string;
}

export interface MemberPerformance {
memberId: string;
memberName: string;

divisionId?: string;
divisionName?: string;

assignedTasks: number;
completedTasks: number;
overdueTasks: number;
inProgressTasks: number;

completionRate: number;

averageCompletionHours?: number;
}

export interface DivisionPerformance {
divisionId: string;
divisionName: string;

totalMembers: number;

assignedTasks: number;
completedTasks: number;
overdueTasks: number;
inProgressTasks: number;

completionRate: number;

averageCompletionHours?: number;
}

export interface TaskTrend {
date: string;

created: number;
completed: number;
}

export interface DivisionChart {
divisionId: string;
divisionName: string;

totalTasks: number;
}

export interface TopMemberChart {
memberId: string;
memberName: string;

completedTasks: number;
}

export interface ReportCharts {
taskTrend: TaskTrend[];
divisionChart: DivisionChart[];
topMembers: TopMemberChart[];
}

export interface ReportResponse {
summary: ReportSummary;

tasks: TaskReport[];
responses: ResponseReport[];

memberPerformance: MemberPerformance[];
divisionPerformance: DivisionPerformance[];

charts: ReportCharts;
}

export interface PaginatedResponse<T> {
data: T[];

total: number;
page: number;
limit: number;
totalPages: number;
}
