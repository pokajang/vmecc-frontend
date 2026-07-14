# Inspection site-location data-layer audit

## Scope and canonical ownership

The shared site catalogue applies only to Fire Extinguisher, General Inspection, and Health Safety Environment inspection. Its canonical hierarchy is the Fire Extinguisher `Zone -> Area -> Location` tree. General/HSE legacy flat roots are not promoted to Zones or merged into this tree.

FRT, SCBA, High Angle Rescue, Hydraulic Rescue Tools, and ER Aux retain their domain-specific catalogue paths.

## Consumer substitution map

| Consumer                             | Decision                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Add Extinguisher drawer              | Uses `useInspectionSiteLocationHierarchy`; its React Select presentation remains local.          |
| Fire Extinguisher Conduct Inspection | `useLocationTypeManager` adapts the shared hierarchy to its existing public option shape.        |
| General Inspection                   | Uses the same shared hierarchy through `useLocationTypeManager`.                                 |
| HSE Inspection                       | Uses the same shared hierarchy through `useLocationTypeManager`.                                 |
| Location management modal            | Site-flow create, rename, and archive delegate to the shared store.                              |
| Progress/detail/continuation code    | Keeps stored string compatibility; pure adapters are available where hierarchy lookup is needed. |
| All Extinguishers table/filtering    | Remains row/string based and does not subscribe to the hierarchy.                                |
| Non-site inspection types            | Continue through `useInspectionLocationCatalog` and the type-specific endpoints.                 |

## Direct location API audit

After migration, calls to `fetchInspectionLocationOptions`, `createInspectionLocationOption`, `updateInspectionLocationOption`, and `deleteInspectionLocationOption` remain only in the generic non-site catalogue hook/action path. The removed drawer-specific hook no longer makes an independent request.

Site consumers use `/inspection/site-locations` through `inspectionSiteLocationApi` and the module-level external store. The store owns cache-first reads, one in-flight refresh, mutation propagation, and the versioned `inspection_site_location_catalog_cache_v1` cache.

## Compatibility and migration safeguards

- Legacy `subLocations` is accepted only by normalization adapters; internal nodes use `children`.
- Stored inspection drafts and historical records keep `zone`, `mainLocation`, and `subLocation` strings, with IDs added when available.
- The legacy local-storage migration accepts only explicit Zone rows and parented Area/Location rows. Flat General/HSE roots remain unmapped rather than being guessed as Zones.
- The backend migration aborts before schema mutation when duplicate active parent/name identities or unmappable custom General/HSE roots are detected.
- Old type-specific endpoints remain operational for non-site consumers and transitional compatibility.
