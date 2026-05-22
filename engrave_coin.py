import bpy
import math

# ─── CONFIG ───────────────────────────────────────────────────────────────────
COIN_PATH     = r"C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting\public\coin.glb"
OUT_PATH      = r"C:\Users\PcUser3\Desktop\autoflows-consulting\autoflows-consulting\public\coin.glb"
TEXT          = "AutoFlows"
TEXT_SCALE    = 0.40   # fraction of coin diameter covered by text
ENGRAVE_DEPTH = 0.15   # fraction of coin thickness to engrave
# ──────────────────────────────────────────────────────────────────────────────

# 1. Clear scene
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# 2. Import GLB
bpy.ops.import_scene.gltf(filepath=COIN_PATH)

# 3. Find coin mesh
coin = None
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        coin = obj
        break

if coin is None:
    raise RuntimeError("No mesh found in imported GLB")

# 4. Normalize: apply transforms, set origin to geometry
bpy.context.view_layer.objects.active = coin
coin.select_set(True)
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 5. Measure
bb = coin.bound_box
xs = [v[0] for v in bb]
zs = [v[2] for v in bb]
coin_w    = max(xs) - min(xs)
coin_t    = max(zs) - min(zs)
face_z    = max(zs)
text_size = coin_w * TEXT_SCALE
engrave_d = coin_t * ENGRAVE_DEPTH

print(f"Coin w={coin_w:.4f} t={coin_t:.4f} | text_size={text_size:.4f} engrave_d={engrave_d:.4f}")

def make_text_mesh(name, z_pos, flip=False):
    bpy.ops.object.text_add(location=(0, 0, z_pos))
    txt = bpy.context.active_object
    txt.name = name
    d = txt.data
    d.body    = TEXT
    d.align_x = 'CENTER'
    d.align_y = 'CENTER'
    d.size    = text_size
    d.extrude = engrave_d * 1.5
    bpy.ops.object.convert(target='MESH')
    if flip:
        txt.rotation_euler[1] = math.pi
        bpy.ops.object.transform_apply(rotation=True)
    return bpy.context.active_object

# 6. Front and back text meshes
front = make_text_mesh("eng_front", face_z)
back  = make_text_mesh("eng_back",  -face_z, flip=True)

# 7. Boolean subtract both from coin
bpy.ops.object.select_all(action='DESELECT')
coin.select_set(True)
bpy.context.view_layer.objects.active = coin

for txt_obj in [front, back]:
    mod = coin.modifiers.new(name="engrave_bool", type='BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.object    = txt_obj
    mod.solver    = 'EXACT'
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(txt_obj, do_unlink=True)

# 8. Export back as GLB
bpy.ops.export_scene.gltf(
    filepath=OUT_PATH,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
)
print(f"✓ Done — exported to: {OUT_PATH}")
