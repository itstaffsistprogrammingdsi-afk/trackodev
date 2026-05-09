import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"

import { getCampaign } from "../api/campaign.api"
import { Campaign } from "../types"
import CampaignMember from "../components/CampaignMembers"

export default function CampaignDetailPage() {
  const { campaignId } = useParams()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getCampaign(campaignId!)
        setCampaign(data)
      } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 403) {
            navigate("/unauthorized")
          }
        }
      }
    }

    fetch()
  }, [campaignId, navigate])

  if (!campaign) return <div>Loading...</div>

  return (
    <div className="p-6 space-y-4">
      {/* HEADER */}
      <div>
        <h1 className="text-xl font-bold">{campaign.name}</h1>

        <p className="text-gray-500">
          {campaign.description || "No description"}
        </p>

        {campaign.due_date && (
          <p className="text-sm text-red-500 mt-1">
            Due: {campaign.due_date}
          </p>
        )}
      </div>

      {/* 🔥 MEMBER SECTION DI SINI */}
      <CampaignMember campaignId={campaignId!} />

      {/* 🔥 NANTI DI SINI MASUK KANBAN */}
      {/* <BoardPage /> */}
    </div>
  )
}