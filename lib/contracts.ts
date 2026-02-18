import { z } from "zod";

export const sourceRefSchema = z.object({
  url: z.string().url(),
  snippet: z.string().trim().min(1)
});

export const firmProfileSchema = z.object({
  brandVoice: z.record(z.string(), z.unknown()).optional(),
  trustSignals: z.object({
    reviews: z.object({
      rating: z.number().nullable(),
      count: z.number().nullable(),
      sources: z.array(sourceRefSchema)
    }),
    awards: z.array(z.object({ claim: z.string().trim().min(1), source: sourceRefSchema })),
    memberships: z.array(z.object({ claim: z.string().trim().min(1), source: sourceRefSchema }))
  }),
  attorneys: z.array(
    z.object({
      name: z.string().trim().min(1),
      credentialLines: z.array(z.string()),
      sources: z.array(sourceRefSchema)
    })
  ),
  processStatements: z.array(z.object({ claim: z.string().trim().min(1), source: sourceRefSchema })),
  differentiators: z.array(
    z.object({
      id: z.string().trim().min(1),
      claim: z.string().trim().min(1),
      type: z.enum(["niche", "speed", "experience", "pricing", "approach", "availability", "geography", "other"]),
      isGeneric: z.boolean(),
      isVerified: z.boolean(),
      source: sourceRefSchema
    })
  ),
  doNotSay: z.array(z.object({ rule: z.string().trim().min(1), source: sourceRefSchema }))
});

export const crawlConfigSchema = z.object({
  maxPages: z.number().int().min(5).max(120),
  maxDepth: z.number().int().min(1).max(6),
  includePaths: z.array(z.string()),
  excludePaths: z.array(z.string())
});

export const crawledPageSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  extractedText: z.string(),
  fetchedAt: z.string().datetime(),
  source: z.enum(["sitemap", "crawl"])
});

export const firmSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().optional(),
  domain: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  crawlConfig: crawlConfigSchema,
  firmProfile: firmProfileSchema.optional(),
  firmProfileUpdatedAt: z.string().datetime().optional(),
  uspSelection: z.object({
    chosenPrimaryUspId: z.string().nullable(),
    chosenSupportingUspIds: z.array(z.string()),
    blockedUspIds: z.array(z.string())
  }),
  crawledPages: z.array(crawledPageSchema),
  crawlErrors: z.array(z.string()).optional()
});

export const projectInputsSchema = z.object({
  consultationOffer: z.string().optional(),
  callbackCommitment: z.string().optional(),
  phone: z.string().optional(),
  reviewRating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  yearsExperience: z.number().nullable().optional(),
  awards: z.string().optional(),
  memberships: z.string().optional(),
  attorneyBios: z.string().optional()
});

export const projectSchema = z.object({
  id: z.string().min(1),
  firmId: z.string().min(1),
  practiceArea: z.string().trim().min(1),
  state: z.string().trim().min(1),
  geo: z.string().trim().optional(),
  createdAt: z.string().datetime(),
  status: z.enum(["draft", "crawl-complete", "usp-selected", "keyword-uploaded", "landing-generated", "ads-generated"]),
  keywordReport: z
    .object({
      text: z.string(),
      fileName: z.string().optional(),
      uploadedAt: z.string().datetime()
    })
    .optional(),
  inputs: projectInputsSchema,
  artifacts: z.object({
    landingPagePack: z.unknown().optional(),
    adsPack: z.unknown().optional(),
    exports: z
      .object({
        markdown: z.string().optional(),
        landingCsvPath: z.string().optional(),
        adCsvPath: z.string().optional(),
        updatedAt: z.string().datetime().optional()
      })
      .optional()
  })
});

export const keywordIntelligenceSchema = z.object({
  topThemes: z.array(z.string()),
  longTailThemes: z.array(z.string()),
  negatives: z.array(z.string())
});

export const landingSchema = z.object({
  keywordIntelligence: keywordIntelligenceSchema,
  keywordToPageMap: z.array(
    z.object({
      keywordTheme: z.string().trim().min(1),
      primaryKeywords: z.array(z.string()),
      landingPageSection: z.enum(["hero", "problem", "types", "guide", "plan", "proof", "objections", "close"]),
      naturalMessageMatchPhrasing: z.string().trim().min(1)
    })
  ),
  landingPage: z.object({
    titleTag: z.string().trim().min(1),
    metaDescription: z.string().trim().min(1),
    sections: z.object({
      hero: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      problem: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      types: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      guide: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      plan: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      proof: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      objections: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      close: z.object({
        headline: z.string().trim().min(1),
        subhead: z.string().optional(),
        bullets: z.array(z.string()),
        body: z.string().trim().min(1)
      }),
      microFaqs: z.array(z.object({ q: z.string().trim().min(1).max(220), a: z.string().trim().min(1).max(900) })).max(4)
    })
  }),
  frameworkCompliance: z.array(
    z.object({
      section: z.string(),
      requirement: z.string(),
      actual: z.string(),
      pass: z.boolean()
    })
  )
});

export const adsSchema = z.object({
  structuralAnalysis: z.record(z.string(), z.unknown()),
  adGroups: z.array(
    z.object({
      name: z.string().trim().min(1),
      rsa: z.object({
        headlines: z.array(
          z.object({
            text: z.string().trim().min(1),
            charCount: z.number().int().min(0),
            pin: z.enum(["H1", "H2"]).nullable().optional()
          })
        ),
        descriptions: z.array(
          z.object({
            text: z.string().trim().min(1),
            charCount: z.number().int().min(0)
          })
        ),
        path1: z.string().trim(),
        path2: z.string().trim()
      }),
      extensions: z.object({
        sitelinks: z.array(
          z.object({
            title: z.string().trim().min(1),
            desc1: z.string().trim(),
            desc2: z.string().trim(),
            finalUrl: z.string().url()
          })
        ),
        callouts: z.array(z.object({ text: z.string().trim().min(1) })),
        structuredSnippets: z.array(
          z.object({
            header: z.string().trim().min(1),
            values: z.array(z.string())
          })
        )
      }),
      serpVariants: z.array(
        z.object({
          title: z.string().trim().min(1),
          description: z.string().trim().min(1)
        })
      )
    })
  ),
  launchChecklist: z.array(z.string())
});

export const firmInputSchema = z.object({
  name: z.string().trim().optional(),
  domain: z.string().trim().min(1)
});

export const firmUpdateProfileSchema = z.object({
  crawlConfig: crawlConfigSchema.optional()
});

export const firmUspSelectionSchema = z.object({
  chosenPrimaryUspId: z.string().nullable(),
  chosenSupportingUspIds: z.array(z.string()),
  blockedUspIds: z.array(z.string())
});

export const projectCreateSchema = z.object({
  firmId: z.string().trim().min(1),
  practiceArea: z.string().trim().min(1),
  state: z.string().trim().min(1),
  geo: z.string().trim().optional()
});

export const projectInputsUpdateSchema = z.object({
  consultationOffer: z.string().optional(),
  callbackCommitment: z.string().optional(),
  phone: z.string().optional(),
  reviewRating: z.number().nullable().optional(),
  reviewCount: z.number().nullable().optional(),
  yearsExperience: z.number().nullable().optional(),
  awards: z.string().optional(),
  memberships: z.string().optional(),
  attorneyBios: z.string().optional(),
  keywordCsvText: z.string().optional(),
  keywordFileName: z.string().optional()
});

