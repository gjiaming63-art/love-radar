import type { AstrologyReport } from "@/types/astrology";

export type ChatAstrologyExpressionLevel = "Strongly Expressed" | "Partially Expressed" | "Not Currently Expressed";

export type ChatAstrologyDimensionKey =
  | "Attraction"
  | "Emotional Bond"
  | "Communication"
  | "Chemistry"
  | "Stability"
  | "Relationship Risk";

export type ChatAstrologyDimension = {
  key: ChatAstrologyDimensionKey;
  realityEvidence: string;
  astrologyPattern: string;
  aiConclusion: string;
  expressionLevel: ChatAstrologyExpressionLevel;
};

export type ChatAstrologyLayer = {
  id?: string;
  reportId: string;
  alignmentScore: number;
  alignmentLevel: ChatAstrologyExpressionLevel;
  summary: string;
  dimensions: ChatAstrologyDimension[];
  astrologySnapshot: Pick<
    AstrologyReport,
    "profileAName" | "profileBName" | "chartA" | "chartB" | "aspects" | "scores" | "coreTags" | "dataQualityNotice" | "engineVersion" | "calculationSource"
  >;
  disclaimer: string;
  createdAt?: string;
};

export const chatAstrologyDimensionKeys: ChatAstrologyDimensionKey[] = [
  "Attraction",
  "Emotional Bond",
  "Communication",
  "Chemistry",
  "Stability",
  "Relationship Risk",
];
