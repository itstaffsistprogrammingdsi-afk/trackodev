import { useEffect, useMemo, useState, useCallback } from "react";
import { useReport } from "../hooks/useReport";

import ReportFilter from "../components/ReportFilter";
import ReportTable, {
  type ReportTableRow,
} from "../components/ReportTable";

import type { UserReportDetail } from "../types";

import {
  fetchLabels,
  fetchBrands,
  fetchDivisions,
  fetchWorkspacesByDivision,
  fetchCampaignsByWorkspace,
  bypassUser,
} from "../api/report.api";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type OptionItem = {
  id: string;
  name: string;
};

type FilterState = {
  start_date: string;
  end_date: string;

  search: string;

  division_ids: string[];

  workspace_ids: string[];

  campaign_ids: string[];

  label_ids: string[];

  brand_ids: string[];
};

export default function ReportPage() {
  const { data, getReportDetail, loading } =
    useReport();

  const [labels, setLabels] = useState<
    OptionItem[]
  >([]);

  const [brands, setBrands] = useState<
    OptionItem[]
  >([]);

  const [workspaces, setWorkspacesByDivision] = useState<
    OptionItem[]
  >([]);

  const [campaigns, setCampaignsByWorkspace] = useState<
    OptionItem[]
  >([]);

  const [divisions, setDivisions] = useState<
    OptionItem[]
  >([]);

  const [filter, setFilter] =
    useState<FilterState>({
      start_date: "",
      end_date: "",

      search: "",

      division_ids: [],

      workspace_ids: [],

      campaign_ids: [],

      label_ids: [],

      brand_ids: [],
    });

  /*
  |--------------------------------------------------------------------------
  | LOAD FILTER OPTIONS
  |--------------------------------------------------------------------------
  */
useEffect(() => {
  const load = async (): Promise<void> => {
    try {
      const [
        labelRes,
        brandRes,
        divisionRes,
      ] = await Promise.all([
        fetchLabels(),
        fetchBrands(),
        fetchDivisions(),
      ]);


setLabels(Array.isArray(labelRes) ? labelRes : []);
setBrands(Array.isArray(brandRes) ? brandRes : []);
      setDivisions(divisionRes.data ?? []
      );

      setWorkspacesByDivision([]);
      setCampaignsByWorkspace([]);
    } catch (error: unknown) {
      console.error(
        "Failed load report filters",
        error
      );
    }
  };

  void load();
}, []);

useEffect(() => {
  const loadWorkspaces =
    async (): Promise<void> => {
      try {
        if (
          filter.division_ids.length === 0
        ) {
          setWorkspacesByDivision([]);

          setCampaignsByWorkspace([]);

          setFilter((prev) => ({
            ...prev,
            workspace_ids: [],
            campaign_ids: [],
          }));

          return;
        }

        const responses =
          await Promise.all(
            filter.division_ids.map(
              (divisionId: string) =>
                fetchWorkspacesByDivision(
                  divisionId
                )
            )
          );

        const workspaceData =
          responses.flatMap(
            (response) =>
              response.data ?? []
          );

        setWorkspacesByDivision(
          workspaceData
        );
      } catch (error: unknown) {
        console.error(
          "Failed load workspaces",
          error
        );
      }
    };

  void loadWorkspaces();
}, [filter.division_ids]);

useEffect(() => {
  const loadCampaigns =
    async (): Promise<void> => {
      try {
        if (
          filter.workspace_ids.length === 0
        ) {
          setCampaignsByWorkspace([]);

          setFilter((prev) => ({
            ...prev,
            campaign_ids: [],
          }));

          return;
        }

        const responses =
          await Promise.all(
            filter.workspace_ids.map(
              (workspaceId: string) =>
                fetchCampaignsByWorkspace(
                  workspaceId
                )
            )
          );

        const campaignData =
          responses.flatMap(
            (response) =>
              response.data ?? []
          );

        setCampaignsByWorkspace(
          campaignData
        );
      } catch (error: unknown) {
        console.error(
          "Failed load campaigns",
          error
        );
      }
    };

  void loadCampaigns();
}, [filter.workspace_ids]);

const handleBypassUser = async (
  userId: string
): Promise<void> => {
  try {
    console.log("Bypass User:", userId);

const response =
  await bypassUser(userId);

const currentToken =
  localStorage.getItem("token");

if (currentToken) {
  localStorage.setItem(
    "admin_token",
    currentToken
  );
}

localStorage.setItem(
  "token",
  response.token
);

localStorage.setItem(
  "user",
  JSON.stringify(response.user)
);

localStorage.setItem(
  "impersonated_by",
  JSON.stringify(
    response.impersonated_by
  )
);

window.location.href = "/";
  } catch (error) {
    console.error(error);
  }
};

  /*
  |--------------------------------------------------------------------------
  | SEARCH
  |--------------------------------------------------------------------------
  */
  const handleSearch = useCallback(
    (): void => {
      if (
        !filter.start_date ||
        !filter.end_date
      ) {
        return;
      }

      void getReportDetail({
        start_date: filter.start_date,
        end_date: filter.end_date,

        search:
          filter.search.trim() ||
          undefined,

        division_ids:
          filter.division_ids.length > 0
            ? filter.division_ids
            : undefined,

        workspace_ids:
          filter.workspace_ids.length > 0
            ? filter.workspace_ids
            : undefined,

        campaign_ids:
          filter.campaign_ids.length > 0
            ? filter.campaign_ids
            : undefined,

        label_ids:
          filter.label_ids.length > 0
            ? filter.label_ids
            : undefined,

        brand_ids:
          filter.brand_ids.length > 0
            ? filter.brand_ids
            : undefined,
      });
    },
    [filter, getReportDetail]
  );


  const handlePreviewUser = (
  userId: string
): void => {
  console.log(
    "preview user:",
    userId
  );

  // nanti bisa diarahkan ke halaman detail report
  // navigate(`/reports/${userId}`);



  // nanti panggil endpoint impersonate
};
  /*
  |--------------------------------------------------------------------------
  | TABLE DATA
  |--------------------------------------------------------------------------
  */
  const tableData = useMemo<
    ReportTableRow[]
  >(() => {
    return data.map(
      (
        user: UserReportDetail
      ): ReportTableRow => {
        const tasks = user.tasks ?? [];

        const completedTasks =
          tasks.filter(
            (task) =>
              task.status ===
                "completed" ||
              task.status === "done"
          );

        const pendingTasks =
          tasks.filter(
            (task) =>
              task.status !==
                "completed" &&
              task.status !== "done"
          );

        const overdueTasks =
          tasks.filter((task) => {
            if (!task.due_date) {
              return false;
            }

            if (
              task.status ===
                "completed" ||
              task.status === "done"
            ) {
              return false;
            }

            return (
              new Date(
                task.due_date
              ).getTime() < Date.now()
            );
          });

        const totalFiles =
          tasks.reduce(
            (
              total: number,
              task
            ): number =>
              total +
              task.attachments.filter(
                (attachment) =>
                  attachment.type ===
                  "file"
              ).length,
            0
          );

        const totalLinks =
          tasks.reduce(
            (
              total: number,
              task
            ): number =>
              total +
              task.attachments.filter(
                (attachment) =>
                  attachment.type ===
                  "link"
              ).length,
            0
          );

        return {
          user_id: user.user_id,

          name: user.name,

          divisions:
            user.divisions,

          total_tasks:
            tasks.length,

          completed_tasks:
            completedTasks.length,

          pending_tasks:
            pendingTasks.length,

          overdue_tasks:
            overdueTasks.length,

          total_files:
            totalFiles,

          total_links:
            totalLinks,
        };
      }
    );
  }, [data]);

  /*
  |--------------------------------------------------------------------------
  | ACTIONS
  |--------------------------------------------------------------------------
  */
  const handlePrintAll = (): void => {
    window.print();
  };

  const handleDownloadAllPDF =
    (): void => {
      console.log(
        "download all pdf"
      );
    };

  const handleDownloadUserPDF = (
    userId: string
  ): void => {
    console.log(
      "download pdf user:",
      userId
    );
  };

  const handlePrintUser = (
    userId: string
  ): void => {
    console.log(
      "print user:",
      userId
    );
  };

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */
  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Report Dashboard
          </h1>

          <p className="text-sm text-gray-500">
            Analytics per user &
            task performance
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={
              handlePrintAll
            }
            className="px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Print All
          </button>

          <button
            type="button"
            onClick={
              handleDownloadAllPDF
            }
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
          >
            Download PDF
          </button>
        </div>
      </div>

      <ReportFilter
        filter={filter}
        setFilter={setFilter}
        onSearch={handleSearch}
        divisions={divisions}
        workspaces={workspaces}
        campaigns={campaigns}
        labels={labels}
        brands={brands}
      />

<ReportTable
  data={tableData}
  loading={loading}
  onDownloadUserPDF={
    handleDownloadUserPDF
  }
  onPrintUser={
    handlePrintUser
  }
  onPreviewUser={
    handlePreviewUser
  }
  onBypassUser={
    handleBypassUser
  }
/>
    </div>
  );
}