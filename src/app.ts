/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Actor, AlphaMode, AssetContainer, AttachPoint, BoxAlignment, ButtonBehavior, ColliderType, CollisionLayer, Color3, Color4, Context, DegreesToRadians, Guid, PlanarGridLayout, Quaternion, ScaledTransform, ScaledTransformLike, User } from "@microsoft/mixed-reality-extension-sdk";
import { DRINK_COMMONS } from "./drink";
import { Player } from "./player";
import { translate } from "./utils";

/**
 * The main class of this app. All the logic goes here.
 */
export default class App {
        private drinksApp: DrinksApp;

        constructor(private context: Context) {
                this.context.onStarted(() => this.started());
                this.context.onUserJoined((u: User) => this.userjoined(u));
                this.context.onUserLeft((u: User) => this.userleft(u));
        }

        /**
         * Once the context is "started", initialize the app.
         */
        private async started() {
                this.drinksApp = new DrinksApp(this.context, {
                        dispensor: {
                                resourceId: 'artifact:2031491611455652680',
                                transform: {
                                        position: {
                                                x: 0, y: -0.2517453, z: -0.08267228
                                        }
                                },
                                dimensions: {
                                        width: 0.3, height: 0.5, depth: 0.25
                                }
                        },
                        drinks: [
                                {
                                        name: 'beer1',
                                        transform: {
                                                position: {
                                                        x: -0.046, y: -0.046, z: 0.097
                                                },
                                                rotation: {
                                                        x: 0, y: 0, z: 90
                                                }
                                        },
                                        fill: {
                                                resourceId: 'artifact:2031009852607693004',
                                                transform: {
                                                        position: {
                                                                x: 0, y: -0.09474531, z: 0.09932772
                                                        },
                                                }
                                        },
                                        levels: [
                                                {
                                                        resourceId: 'artifact:2031009852473475275',
                                                },
                                                {
                                                        resourceId: 'artifact:2031009852867739853',
                                                },
                                                {
                                                        resourceId: 'artifact:2031009852347646154',
                                                }
                                        ]
                                },
                                {
                                        name: 'beer2',
                                        transform: {
                                                position: {
                                                        x: -0.046, y: -0.046, z: 0.097
                                                },
                                                rotation: {
                                                        x: 0, y: 0, z: 90
                                                }
                                        },
                                        fill: {
                                                resourceId: 'artifact:2031009852607693004',
                                                transform: {
                                                        position: {
                                                                x: 0, y: -0.09474531, z: 0.09932772
                                                        },
                                                }
                                        },
                                        levels: [
                                                {
                                                        resourceId: 'artifact:2031009852473475275',
                                                },
                                                {
                                                        resourceId: 'artifact:2031009852867739853',
                                                },
                                                {
                                                        resourceId: 'artifact:2031009852347646154',
                                                }
                                        ]
                                }
                        ],
                        mouth: {
                                dimensions: {
                                        width: 0.08,
                                        height: 0.08,
                                        depth: 0.08
                                },
                                transform: {
                                        position: {
                                                x: 0.00039,
                                                y: -0.09840258,
                                                z: 0.1823
                                        }
                                }
                        },
                        tray: {
                                resourceId: 'artifact:2031782451776324174',
                                transform: {
                                        position: {
                                                x: 0.423,
                                                y: -0.24,
                                                z: -0.088
                                        }
                                },
                                dimensions: {
                                        width: 0.52, height: 0.04, depth: 0.4
                                }
                        }
                });
        }

        private async userjoined(user: User) {
                this.drinksApp?.userjoined(user);
        }

        private async userleft(user: User) {
                this.drinksApp?.userleft(user);
        }

        /**
         * Generate keyframe data for a simple spin animation.
         * @param duration The length of time in seconds it takes to complete a full revolution.
         * @param axis The axis of rotation in local space.
         */
}

export interface DrinksAppOptions {
        dispensor: {
                resourceId: string,
                transform: Partial<ScaledTransformLike>,
                dimensions: {
                        width: number,
                        height: number,
                        depth: number
                }
        },
        drinks: {
                name: string,
                transform: Partial<ScaledTransformLike>,
                fill: {
                        resourceId: string,
                        transform: Partial<ScaledTransformLike>,
                }
                levels: {
                        resourceId: string,
                        sound?: string,
                }[],
        }[],
        mouth: {
                attachPoint?: AttachPoint,
                transform: Partial<ScaledTransformLike>,
                dimensions: {
                        width: number,
                        height: number,
                        depth: number
                }
        },
        tray: {
                resourceId: string,
                transform: Partial<ScaledTransformLike>,
                dimensions: {
                        width: number,
                        height: number,
                        depth: number
                }
        }
}

export class DrinksApp {
        private assets: AssetContainer;
        private anchor: Actor;

        private dispensorAnchor: Actor;
        private dispensorGridLayout: PlanarGridLayout;
        private dispensors: Actor[] = [];

        private fills: Map<number, Actor>;
        private players: Map<Guid, Player>;

        constructor(private context: Context, private options: DrinksAppOptions) {
                this.assets = new AssetContainer(this.context);
                this.fills = new Map<number, Actor>();
                this.players = new Map<Guid, Player>();
                this.init();
        }

        private init() {
                this.anchor = Actor.Create(this.context);
                this.createDispensors();
                this.createTray();
        }

        private createDispensors() {
                this.dispensorAnchor?.destroy();
                this.dispensorAnchor = Actor.Create(this.context);
                this.dispensorGridLayout = new PlanarGridLayout(this.dispensorAnchor);
                this.dispensors = [...Array(this.options.drinks.length).keys()].map(i => {
                        // collider
                        const dim = this.options.dispensor.dimensions;
                        let mesh = this.assets.meshes.find(m => m.name === 'mesh_dispensor_collider');
                        if (!mesh) {
                                mesh = this.assets.createBoxMesh('mesh_dispensor_collider', dim.width, dim.height, dim.depth);
                        }

                        let material = this.assets.materials.find(m => m.name === 'invisible');
                        if (!material) {
                                material = this.assets.createMaterial('invisible', { color: Color4.FromColor3(Color3.Red(), 0.0), alphaMode: AlphaMode.Blend });
                        }
                        const collider = Actor.Create(this.context, {
                                actor: {
                                        parentId: this.dispensorAnchor.id,
                                        appearance: {
                                                meshId: mesh.id,
                                                materialId: material.id,
                                        },
                                        collider: {
                                                geometry: {
                                                        shape: ColliderType.Box
                                                },
                                                layer: CollisionLayer.Hologram
                                        }
                                }
                        });

                        collider.setBehavior(ButtonBehavior).onClick((user, _) => {
                                if (!this.fills.has(i)) {
                                        this.spawnFill(i);
                                } else {
                                        this.removeFill(i);
                                        this.equipDrink(i, user);
                                }
                        });

                        // model
                        const local = translate(this.options.dispensor.transform).toJSON();
                        const resourceId = this.options.dispensor.resourceId;
                        Actor.CreateFromLibrary(this.context, {
                                resourceId,
                                actor: {
                                        parentId: collider.id,
                                        transform: {
                                                local
                                        }
                                }
                        });

                        this.dispensorGridLayout.addCell({
                                row: 0,
                                column: i,
                                width: this.options.dispensor.dimensions.width,
                                height: this.options.dispensor.dimensions.height,
                                contents: collider,
                        });

                        this.dispensorGridLayout.gridAlignment = BoxAlignment.MiddleLeft;
                        this.dispensorGridLayout.applyLayout();
                        return collider;
                });
        }

        private createTray() {
                // collider
                const dim = this.options.tray.dimensions;
                let mesh = this.assets.meshes.find(m => m.name === 'tray_collider');
                if (!mesh) {
                        mesh = this.assets.createBoxMesh('tray_collider', dim.width, dim.height, dim.depth);
                }

                let material = this.assets.materials.find(m => m.name === 'invisible');
                if (!material) {
                        material = this.assets.createMaterial('invisible', { color: Color4.FromColor3(Color3.Red(), 0.0), alphaMode: AlphaMode.Blend });
                }
                const local = translate(this.options.tray.transform);
                const collider = Actor.Create(this.context, {
                        actor: {
                                transform: {
                                        local
                                },
                                appearance: {
                                        meshId: mesh.id,
                                        materialId: material.id,
                                },
                                collider: {
                                        geometry: {
                                                shape: ColliderType.Box
                                        },
                                        layer: CollisionLayer.Hologram
                                }
                        }
                });

                collider.setBehavior(ButtonBehavior).onClick((user, _) => {
                        const player = this.players.get(user.id);
                        if (!player){ return; }
                        player.removeDrink();
                });

                // model
                const resourceId = this.options.tray.resourceId;
                Actor.CreateFromLibrary(this.context, {
                        resourceId,
                        actor: {
                                parentId: collider.id,
                        }
                });
        }

        private spawnFill(i: number) {
                if (this.fills.has(i)) return;
                const resourceId = this.options.drinks[i].fill.resourceId;
                const parentId = this.dispensors[i].id;
                const local = translate(this.options.drinks[i].fill.transform).toJSON();
                const fill = Actor.CreateFromLibrary(this.context, {
                        resourceId,
                        actor: {
                                parentId,
                                transform: {
                                        local
                                }
                        }
                });
                this.fills.set(i, fill);
        }

        private removeFill(i: number) {
                if (!this.fills.has(i)) return;
                const fill = this.fills.get(i);
                fill?.destroy();
        }

        private equipDrink(i: number, user: User) {
                const player = this.players.get(user.id);
                player?.equipDrink({
                        user,
                        transform: this.options.drinks[i].transform,
                        levels: this.options.drinks[i].levels,
                        trigger: DRINK_COMMONS.trigger
                });
        }

        public async userjoined(user: User) {
                this.createPlayer(user);
        }

        public async userleft(user: User) {
                this.removePlayer(user);
        }

        private createPlayer(user: User) {
                if (this.players.has(user.id)) return;
                const player = new Player(this.context, this.assets, {
                        user,
                        mouth: this.options.mouth
                });
                this.players.set(user.id, player);
        }

        private removePlayer(user: User) {
                if (!this.players.get(user.id)) return;
                this.players.get(user.id)?.remove();
                this.players.delete(user.id);
        }
}