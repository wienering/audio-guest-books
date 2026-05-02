import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import type { ClientReportPdfInput } from "@/lib/client-report-types";

/* eslint-disable jsx-a11y/alt-text -- @react-pdf/renderer Image has no alt prop */

const BASE_PAGE = StyleSheet.create({
  page: {
    padding: 52,
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1a1a1a",
    lineHeight: 1.45,
  },
  spacerGrow: {
    flexGrow: 1,
  },
});

const THANK_YOU =
  "Thanks for sharing this experience with us. The recordings in this guest book represent real moments from people who matter to you, and it was a privilege to help capture them. We hope this collection brings back memories for years to come.";

function formatListeningTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0m";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatWebsiteDisplay(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  return t.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function ClientReportDocument(props: ClientReportPdfInput) {
  const b = props.branding;
  const accent = b.playerProgressFill;
  const headingColor = b.bodyHeadingColor;
  const mutedColor = b.headerSubtitleColor;
  const bodyColor = b.bodyTextColor;

  const hasRecordings = props.recordingCount > 0;
  const showPlays =
    hasRecordings && props.analytics?.ok === true;
  const showUniqueListeners =
    hasRecordings &&
    props.analytics?.ok === true &&
    props.analytics.uniqueListeners > 0;

  const contactLines: string[] = [];
  contactLines.push(props.companyName);
  if (props.contactEmail?.trim()) {
    contactLines.push(props.contactEmail.trim());
  }
  if (props.contactPhone?.trim()) {
    contactLines.push(props.contactPhone.trim());
  }
  if (props.contactWebsite?.trim()) {
    contactLines.push(formatWebsiteDisplay(props.contactWebsite.trim()));
  }

  return (
    <Document
      title={`${props.eventName} — Guest book report`}
      author={props.companyName}
      language="en-US"
    >
      <Page size="LETTER" style={BASE_PAGE.page}>
        {props.logoDataUri ? (
          <Image
            src={props.logoDataUri}
            style={{ maxHeight: 52, maxWidth: 220, marginBottom: 8 }}
          />
        ) : (
          <Text
            style={{
              fontFamily: "Times-Bold",
              fontSize: 15,
              color: headingColor,
              marginBottom: 4,
            }}
          >
            {props.companyName}
          </Text>
        )}

        <View
          style={{
            height: 2,
            backgroundColor: accent,
            marginTop: 20,
            marginBottom: 28,
            width: "100%",
          }}
        />

        <Text
          style={{
            fontFamily: "Times-Bold",
            fontSize: 26,
            color: headingColor,
            lineHeight: 1.15,
          }}
        >
          {props.eventName}
        </Text>

        <Text
          style={{
            fontFamily: "Times-Roman",
            fontSize: 13,
            color: mutedColor,
            marginTop: 14,
          }}
        >
          {props.clientName}
        </Text>

        <Text
          style={{
            fontFamily: "Times-Roman",
            fontSize: 12,
            color: bodyColor,
            marginTop: 10,
          }}
        >
          {props.eventDateFormatted}
        </Text>

        <View style={BASE_PAGE.spacerGrow} />

        <Text style={{ fontSize: 9, color: mutedColor }}>
          Report generated {props.generatedAtFormatted}
        </Text>
      </Page>

      <Page size="LETTER" style={BASE_PAGE.page}>
        <View
          style={{
            height: 2,
            backgroundColor: accent,
            marginBottom: 22,
            width: "100%",
          }}
        />

        <Text
          style={{
            fontFamily: "Times-Bold",
            fontSize: 20,
            color: accent,
            marginBottom: 18,
          }}
        >
          By the numbers
        </Text>

        {hasRecordings ? (
          <View>
            <Text style={{ color: bodyColor, marginBottom: 10 }}>
              • Total recordings: {props.recordingCount}{" "}
              {props.recordingCount === 1 ? "file" : "files"}
            </Text>
            <Text style={{ color: bodyColor, marginBottom: 10 }}>
              • Total listening time:{" "}
              {formatListeningTime(props.totalDurationSeconds)}
            </Text>
            {showPlays ? (
              <Text style={{ color: bodyColor, marginBottom: 10 }}>
                • Total plays: {props.analytics!.totalPlays}
              </Text>
            ) : null}
            {showUniqueListeners ? (
              <Text style={{ color: bodyColor, marginBottom: 10 }}>
                • Unique listeners: {props.analytics!.uniqueListeners}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text
            style={{
              fontFamily: "Helvetica",
              color: mutedColor,
              fontSize: 11,
            }}
          >
            No recordings yet
          </Text>
        )}

        <View style={{ height: 28 }} />

        <Text
          style={{
            fontFamily: "Times-Roman",
            fontSize: 11,
            color: bodyColor,
            lineHeight: 1.55,
          }}
        >
          {THANK_YOU}
        </Text>

        <View style={{ height: 36 }} />

        <View
          style={{
            height: 1,
            backgroundColor: accent,
            opacity: 0.55,
            marginBottom: 16,
            width: "100%",
          }}
        />

        <Text
          style={{
            fontFamily: "Times-Bold",
            fontSize: 11,
            color: headingColor,
            marginBottom: 10,
          }}
        >
          Prepared by
        </Text>

        {contactLines.map((line, i) => (
          <Text
            key={`${line}-${i}`}
            style={{
              fontSize: 10,
              color: mutedColor,
              marginBottom: 4,
            }}
          >
            {line}
          </Text>
        ))}
      </Page>
    </Document>
  );
}
