/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Actor, AlphaMode, AssetContainer, AttachPoint, BoxAlignment, ButtonBehavior, ColliderType, CollisionLayer, Color3, Color4, Context, DegreesToRadians, Guid, ParameterSet, PlanarGridLayout, Quaternion, ScaledTransform, ScaledTransformLike, User } from "@microsoft/mixed-reality-extension-sdk";
import { Player } from "./player";
import { fetchJSON, translate } from "./utils";

const MIN_SYNC_INTERVAL = 1;

const DEFAULT_DRINKS = [
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
                                resourceId: 'artifact:2031999289508496224',
                        },
                        {
                                resourceId: 'artifact:2031999289240060766',
                        },
                        {
                                resourceId: 'artifact:2031999289374278495',
                        },
                        {
                                resourceId: 'artifact:2031009852473475275',
                        },
                        {
                                resourceId: 'artifact:2031009852867739853',
                        },
                        {
                                resourceId: 'artifact:2031009852347646154',
                        }
                ],
                trigger: {
                        transform: {
                                position: {
                                        x: -0.1488, y: -0.0443, z: 0.0424
                                },
                                rotation: {
                                        x: 0, y: 0, z: 90
                                },
                        },
                        dimensions: {
                                width: 0.04,
                                height: 0.04,
                                depth: 0.04
                        }
                }
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
                ],
                trigger: {
                        transform: {
                                position: {
                                        x: -0.1488, y: -0.0443, z: 0.0424
                                },
                                rotation: {
                                        x: 0, y: 0, z: 90
                                },
                        },
                        dimensions: {
                                width: 0.04,
                                height: 0.04,
                                depth: 0.04
                        }
                }
        }
];

/**
 * The main class of this app. All the logic goes here.
 */
export default class App {
        private drinksApp: DrinksApp;
        private url: string;

        constructor(private context: Context, params: ParameterSet) {
                this.url = params['url'] as string;
                this.context.onStarted(() => this.started());
                this.context.onUserJoined((u: User) => this.userjoined(u));
                this.context.onUserLeft((u: User) => this.userleft(u));
        }

        /**
         * Once the context is "started", initialize the app.
         */
        private async started() {
                let drinks = this.url ? await fetchJSON(this.url) : DEFAULT_DRINKS;
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
                        drinks,
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
                trigger: {
                        transform: Partial<ScaledTransformLike>,
                        dimensions: {
                                width: number,
                                height: number,
                                depth: number
                        }
                }
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

        private tray: Actor;

        private fills: Map<number, Actor>;
        private players: Map<Guid, Player>;

        // sync fix
        private syncTimeout: NodeJS.Timeout;

        constructor(private context: Context, private options: DrinksAppOptions) {
                this.assets = new AssetContainer(this.context);
                this.fills = new Map<number, Actor>();
                this.players = new Map<Guid, Player>();
                this.assets.createMaterial('invisible', { color: Color4.FromColor3(Color3.Red(), 0.0), alphaMode: AlphaMode.Blend });
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

                        const material = this.assets.materials.find(m => m.name === 'invisible');
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

                this.setDispenserBehaviors();
        }

        private setDispenserBehaviors() {
                this.dispensors.forEach((d, i) => {
                        d.setBehavior(ButtonBehavior).onClick((user, _) => {
                                if (!this.fills.has(i)) {
                                        this.spawnFill(i);
                                } else {
                                        this.removeFill(i);
                                        this.equipDrink(i, user);
                                }
                        });
                })
        }

        private createTray() {
                // collider
                const dim = this.options.tray.dimensions;
                let mesh = this.assets.meshes.find(m => m.name === 'tray_collider');
                if (!mesh) {
                        mesh = this.assets.createBoxMesh('tray_collider', dim.width, dim.height, dim.depth);
                }

                const material = this.assets.materials.find(m => m.name === 'invisible');
                const local = translate(this.options.tray.transform);
                this.tray = Actor.Create(this.context, {
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

                // model
                const resourceId = this.options.tray.resourceId;
                Actor.CreateFromLibrary(this.context, {
                        resourceId,
                        actor: {
                                parentId: this.tray.id,
                        }
                });

                this.setTrayBehavior();
        }

        private setTrayBehavior() {
                this.tray.setBehavior(ButtonBehavior).onClick((user, _) => {
                        const player = this.players.get(user.id);
                        if (!player) { return; }
                        player.removeDrink();
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
                this.fills.delete(i);
        }

        private equipDrink(i: number, user: User) {
                const player = this.players.get(user.id);
                player?.equipDrink({
                        user,
                        transform: this.options.drinks[i].transform,
                        levels: this.options.drinks[i].levels,
                        trigger: this.options.drinks[i].trigger
                });
        }

        public async userjoined(user: User) {
                if (!this.syncTimeout) {
                        this.syncTimeout = setTimeout(() => {
                                this.sync();
                        }, MIN_SYNC_INTERVAL * 1000);
                }
                this.createPlayer(user);
        }

        public async userleft(user: User) {
                this.removePlayer(user);
        }

        private sync() {
                this.syncTimeout = null;
                this.players.forEach(p => {
                        p.reattach();
                });

                this.setTrayBehavior();
                this.setDispenserBehaviors();
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