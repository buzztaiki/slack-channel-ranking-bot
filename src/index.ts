#!/usr/bin/env node

import { WebClient, WebAPICallResult } from "@slack/client"
import moment from "moment"
import { CronJob } from "cron"

interface ChannelsListResult extends WebAPICallResult {
  channels: Channel[]
}

interface ChannelsHistoryResult extends WebAPICallResult {
  messages: Message[]
}

type Channel = {
  id: string
  name: string
}

type Message = {
  ts: string
  user: string
  text: string
  bot_id?: string
}

type ChannelInfo = {
  id: string
  name: string
  count: number
}

function main() {
  const job = new CronJob("10 0 0 * * *", postRanking, undefined, true, "Asia/Tokyo")
  job.start()
}

async function postRanking() {
  const api = apiFactory()

  Promise.all(await fetchChannelInfos(await fetchChannels())).then(channelInfos => {
    api.chat.postMessage({
      channel: process.env.POST_CHANNEL || "",
      text: channelInfosToRanking(channelInfos),
      username: "ranking-bot",
      icon_url: process.env.ICON_URL
    })
  })
}

function channelInfosToRanking(channelInfos: ChannelInfo[]) {
  const date = moment()
    .utcOffset("+09:00")
    .hour(0)
    .minute(0)
    .second(0)

  const message = channelInfos
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(ch => `- <#${ch.id}> (${ch.count})`)
    .join("\n")
  return `== ${date.subtract(1, "days").format("YYYY-MM-DD")} の発言数ランキング ==\n${message}`
}

async function fetchChannelInfos(channels: Channel[]) {
  const api = apiFactory()
  const latest = moment()
    .utcOffset("+09:00")
    .hour(0)
    .minute(0)
    .second(0)
  const oldest = latest.clone().subtract(1, "days")

  return channels.map(
    async (channel): Promise<ChannelInfo> => {
      const res = (await api.channels.history({
        channel: channel.id,
        latest: latest.unix().toString(),
        oldest: oldest.unix().toString(),
        count: 1000
      })) as ChannelsHistoryResult

      return {
        id: channel.id,
        name: channel.name,
        count: res.messages.filter(message => !message.bot_id).length
      }
    }
  )
}

async function fetchChannels(): Promise<Channel[]> {
  const api = apiFactory()
  const res = (await api.channels.list({ exclude_archived: true, exclude_members: true })) as ChannelsListResult
  return res.channels.map((channel: Channel) => ({ id: channel.id, name: channel.name }))
}

function apiFactory() {
  const token = process.env.SLACK_TOKEN
  return new WebClient(token)
}

main()
