-- PostgreSQL requires a commit before a newly-added enum value can be used.
ALTER TYPE "TechnicalCatalogType" ADD VALUE 'PLAN_SCOPE';
