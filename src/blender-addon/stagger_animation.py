# todo: an addon that would aid in the creation of staggered animations, with lots of options for
# how the stagger is applied, stuff like sorting by distance from an object, distribution of it
# repeated animations, randomization to the order and the animation itself, etc.
import bpy

StaggerSortMode = bpy.props.EnumProperty(
  name="Stagger Sort Mode",
  description="How to sort objects for staggering",
  items=[
    ('NONE', "None", "No sorting"),
    ('NAME', "Name", "Sort by name"),
    ('RANDOM', "Random", "Sort randomly"),
    ('LOC_X', "Location X", "Sort by location X"),
    ('LOC_Y', "Location Y", "Sort by location Y"),
    ('LOC_Z', "Location Z", "Sort by location Z"),
    ('NEAREST', "Nearest to Object", "Sort by distance to another object"),
    ('FURTHEST', "Furthest from Object", "Sort by distance to another object"),
  ],
  default='NONE',
)
