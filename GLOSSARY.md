# Glossary

The domain language of this project. Use these terms in code, tests, commits and UI copy.

**Baumkataster**
The City of Vienna's register of trees on city-owned land, published as open government data.
_Avoid_: tree database, tree API.

**Tree**
One entry in the Baumkataster: a single planted tree at a fixed location.

**Tree id**
The identifier of a Tree in the Baumkataster (`OBJECTID` in the source). Unique. The only reliable way to point at one Tree.
_Avoid_: id, object id.

**Tree number**
The number on the tree's tag in the street (`BAUMNUMMER` in the source). Not unique across the city: the same Tree number can belong to several Trees in different streets or parks.
_Avoid_: tree id, ref.

**Species**
What kind of tree it is, as a scientific name with an optional German common name, e.g. _Acer platanoides_ (Spitzahorn).
_Avoid_: art, type.

**Size class**
A bucketed measurement the Baumkataster records instead of an exact value. Height and crown diameter are size classes; trunk circumference is exact (centimetres).

**Location**
Where a Tree stands: the street, park or facility it belongs to, its district and its Area.

**Area**
The city's grouping a Tree is registered under (`GEBIETSGRUPPE`), shown as "Gebiet". Part of a Tree's Location.

**Finding**
One Tree in the answer to a Search, with its Distance when the Search has a Position. The answer as a whole is the Findings, which also say whether the list was cut off.

**Nearby search**
A Search for Trees within the Search radius of a Position, ordered by Distance.

**Tree number search**
A Search for every Tree with a given Tree number.

**Search**
What the person is currently asking for: a Nearby search, a Tree number search, or one specific Tree by Tree id. A Search can be written into, and read back from, the page address.

**Position**
A point on Earth (latitude, longitude). The person's Position comes from the device.

**Distance**
Great-circle distance in metres between a Position and a Tree.

**Search radius**
The maximum Distance a Tree may have to appear in a Nearby search. 1 km.

**Refetch threshold**
How far the person's Position has to move before a Nearby search is asked again. 100 m.
