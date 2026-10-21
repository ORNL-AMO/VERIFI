# Custom UI icons

Use `app-ui-icon` for both Hugeicons and custom icons. Register semantic names in
[`icon-registry.ts`](icon-registry.ts); consumers do not choose a renderer.

To add a custom icon:

1. Keep its reviewed 24 × 24 SVG design source in `src/assets/icons/`.
2. Add a typed `IconSvgObject` definition in [`custom-icons.ts`](custom-icons.ts).
   Copy geometry and inherited SVG attributes onto the individual elements.
   Use `currentColor` for themed strokes/fills. The existing renderer supports
   paths, circles, ellipses, rectangles, lines, polylines, and polygons; flatten
   transforms/groups in the source before registering an icon.
3. Export a semantic entry through `CUSTOM_ICONS`. Its keys automatically join
   `IconName` alongside the Hugeicons registry entries.
4. Test the rendered geometry against the asset and verify sizing, stroke width,
   and accessible labeling. Keep the asset and definition synchronized.

Example: `<app-ui-icon name="dataVisualization" [size]="20" />`.
Icons are decorative by default. For a meaningful standalone icon, set
`[decorative]="false"` and supply `label`; labeled buttons normally keep their
icons decorative.
