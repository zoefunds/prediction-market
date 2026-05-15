/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/prediction_market.json`.
 */
export type PredictionMarket = {
  "address": "3yC9BuiC3kkkjDw1wFtW4AxXmezRM3U8GfWRxGoqxd7A",
  "metadata": {
    "name": "predictionMarket",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Arcium & Anchor"
  },
  "instructions": [
    {
      "name": "cancelMarket",
      "discriminator": [
        205,
        121,
        84,
        210,
        222,
        71,
        150,
        11
      ],
      "accounts": [
        {
          "name": "creator",
          "docs": [
            "The market creator (only they can cancel an open market)."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "market"
          ]
        },
        {
          "name": "market",
          "docs": [
            "The market being cancelled. Must be in Open status, must be owned",
            "by `creator`."
          ],
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "claimPayout",
      "discriminator": [
        127,
        240,
        132,
        62,
        227,
        198,
        146,
        133
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  65,
                  114,
                  99,
                  105,
                  117,
                  109,
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        }
      ]
    },
    {
      "name": "claimPayoutV2Callback",
      "discriminator": [
        93,
        228,
        129,
        144,
        219,
        28,
        58,
        66
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market"
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "claimPayoutV2Output"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "createMarket",
      "discriminator": [
        103,
        226,
        97,
        235,
        200,
        188,
        251,
        254
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "config.market_count",
                "account": "config"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "question",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "category",
          "type": "string"
        },
        {
          "name": "closeTs",
          "type": "i64"
        },
        {
          "name": "resolver",
          "type": "pubkey"
        },
        {
          "name": "initialTotalsCiphertext",
          "type": {
            "array": [
              "u8",
              96
            ]
          }
        },
        {
          "name": "initialTotalsPubkey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "initialTotalsNonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "initClaimPayoutCompDef",
      "discriminator": [
        30,
        107,
        212,
        73,
        136,
        55,
        137,
        211
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram",
          "address": "AddressLookupTab1e1111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initResolveMarketCompDef",
      "discriminator": [
        78,
        239,
        171,
        21,
        24,
        135,
        40,
        228
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram",
          "address": "AddressLookupTab1e1111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initSubmitPositionCompDef",
      "discriminator": [
        113,
        242,
        240,
        181,
        205,
        91,
        64,
        136
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "mxeAccount",
          "writable": true
        },
        {
          "name": "compDefAccount",
          "writable": true
        },
        {
          "name": "addressLookupTable",
          "writable": true
        },
        {
          "name": "lutProgram",
          "address": "AddressLookupTab1e1111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBps",
          "type": "u16"
        },
        {
          "name": "feeRecipient",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "requestResolution",
      "discriminator": [
        200,
        62,
        148,
        110,
        22,
        92,
        78,
        187
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "resolver",
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  65,
                  114,
                  99,
                  105,
                  117,
                  109,
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "outcomeCiphertext",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "resolverPubkey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        }
      ]
    },
    {
      "name": "resolveMarketV2Callback",
      "discriminator": [
        247,
        91,
        10,
        78,
        31,
        122,
        84,
        222
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "resolveMarketV2Output"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "submitPosition",
      "discriminator": [
        164,
        179,
        77,
        239,
        217,
        239,
        158,
        151
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "market",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market.id",
                "account": "market"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "payer"
              }
            ]
          }
        },
        {
          "name": "signPdaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  65,
                  114,
                  99,
                  105,
                  117,
                  109,
                  83,
                  105,
                  103,
                  110,
                  101,
                  114,
                  65,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "mempoolAccount",
          "writable": true
        },
        {
          "name": "executingPool",
          "writable": true
        },
        {
          "name": "computationAccount",
          "writable": true
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "clusterAccount",
          "writable": true
        },
        {
          "name": "poolAccount",
          "writable": true,
          "address": "G2sRWJvi3xoyh5k2gY49eG9L8YhAEWQPtNb1zb1GXTtC"
        },
        {
          "name": "clockAccount",
          "writable": true,
          "address": "7EbMUTLo5DjdzbN7s8BXeZwXzEwNQb1hScfRvWg8a6ot"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        }
      ],
      "args": [
        {
          "name": "computationOffset",
          "type": "u64"
        },
        {
          "name": "positionCiphertext",
          "type": {
            "array": [
              "u8",
              64
            ]
          }
        },
        {
          "name": "userPubkey",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "nonce",
          "type": "u128"
        },
        {
          "name": "stakeAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "submitPositionV2Callback",
      "discriminator": [
        75,
        59,
        240,
        206,
        152,
        52,
        15,
        78
      ],
      "accounts": [
        {
          "name": "arciumProgram",
          "address": "Arcj82pX7HxYKLR92qvgZUAd7vGS1k4hQvAFcPATFdEQ"
        },
        {
          "name": "compDefAccount"
        },
        {
          "name": "mxeAccount"
        },
        {
          "name": "computationAccount"
        },
        {
          "name": "clusterAccount"
        },
        {
          "name": "instructionsSysvar",
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "position",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "output",
          "type": {
            "defined": {
              "name": "signedComputationOutputs",
              "generics": [
                {
                  "kind": "type",
                  "type": {
                    "defined": {
                      "name": "submitPositionV2Output"
                    }
                  }
                }
              ]
            }
          }
        }
      ]
    },
    {
      "name": "withdrawPosition",
      "discriminator": [
        254,
        30,
        169,
        94,
        33,
        171,
        39,
        104
      ],
      "accounts": [
        {
          "name": "user",
          "docs": [
            "The position holder."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "position"
          ]
        },
        {
          "name": "market",
          "docs": [
            "The market the position belongs to. Must be Cancelled."
          ],
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "market"
              }
            ]
          }
        },
        {
          "name": "position",
          "docs": [
            "The user's position on this market. Closed on success; rent → user."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "market"
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "arciumSignerAccount",
      "discriminator": [
        214,
        157,
        122,
        114,
        117,
        44,
        214,
        74
      ]
    },
    {
      "name": "clockAccount",
      "discriminator": [
        152,
        171,
        158,
        195,
        75,
        61,
        51,
        8
      ]
    },
    {
      "name": "cluster",
      "discriminator": [
        236,
        225,
        118,
        228,
        173,
        106,
        18,
        60
      ]
    },
    {
      "name": "computationDefinitionAccount",
      "discriminator": [
        245,
        176,
        217,
        221,
        253,
        104,
        172,
        200
      ]
    },
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "feePool",
      "discriminator": [
        172,
        38,
        77,
        146,
        148,
        5,
        51,
        242
      ]
    },
    {
      "name": "mxeAccount",
      "discriminator": [
        103,
        26,
        85,
        250,
        179,
        159,
        17,
        117
      ]
    },
    {
      "name": "market",
      "discriminator": [
        219,
        190,
        213,
        55,
        0,
        227,
        198,
        154
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    }
  ],
  "events": [
    {
      "name": "marketCancelled",
      "discriminator": [
        139,
        163,
        33,
        168,
        19,
        180,
        81,
        170
      ]
    },
    {
      "name": "marketCreated",
      "discriminator": [
        88,
        184,
        130,
        231,
        226,
        84,
        6,
        58
      ]
    },
    {
      "name": "marketResolutionRequested",
      "discriminator": [
        204,
        233,
        88,
        30,
        189,
        41,
        2,
        164
      ]
    },
    {
      "name": "marketResolved",
      "discriminator": [
        89,
        67,
        230,
        95,
        143,
        106,
        199,
        202
      ]
    },
    {
      "name": "payoutClaimed",
      "discriminator": [
        200,
        39,
        105,
        112,
        116,
        63,
        58,
        149
      ]
    },
    {
      "name": "positionSubmitted",
      "discriminator": [
        159,
        49,
        16,
        227,
        58,
        249,
        245,
        64
      ]
    },
    {
      "name": "positionWithdrawn",
      "discriminator": [
        207,
        105,
        38,
        76,
        190,
        32,
        8,
        81
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "clusterNotSet",
      "msg": "Cluster not set in MXE account"
    },
    {
      "code": 6001,
      "name": "abortedComputation",
      "msg": "Computation was aborted by the MPC cluster"
    },
    {
      "code": 6002,
      "name": "questionTooLong",
      "msg": "Question text exceeds maximum length"
    },
    {
      "code": 6003,
      "name": "descriptionTooLong",
      "msg": "Description exceeds maximum length"
    },
    {
      "code": 6004,
      "name": "categoryTooLong",
      "msg": "Category exceeds maximum length"
    },
    {
      "code": 6005,
      "name": "marketNotOpen",
      "msg": "Market is not currently open for positions"
    },
    {
      "code": 6006,
      "name": "marketNotClosed",
      "msg": "Market has not yet reached its close timestamp"
    },
    {
      "code": 6007,
      "name": "alreadyResolved",
      "msg": "Market has already been resolved"
    },
    {
      "code": 6008,
      "name": "notResolved",
      "msg": "Market is not yet resolved"
    },
    {
      "code": 6009,
      "name": "invalidCloseTime",
      "msg": "Resolution timestamp is in the past"
    },
    {
      "code": 6010,
      "name": "unauthorizedResolver",
      "msg": "Caller is not authorized to resolve this market"
    },
    {
      "code": 6011,
      "name": "alreadyClaimed",
      "msg": "Position has already been claimed"
    },
    {
      "code": 6012,
      "name": "invalidOutcome",
      "msg": "Invalid outcome value (must be 0 or 1)"
    },
    {
      "code": 6013,
      "name": "zeroStake",
      "msg": "Stake amount must be greater than zero"
    },
    {
      "code": 6014,
      "name": "insufficientVaultBalance",
      "msg": "Insufficient vault balance for payout"
    },
    {
      "code": 6015,
      "name": "unauthorized",
      "msg": "Caller is not authorized for this operation"
    },
    {
      "code": 6016,
      "name": "marketNotCancelled",
      "msg": "Market is not in Cancelled status"
    },
    {
      "code": 6017,
      "name": "vaultUnderfunded",
      "msg": "Vault does not have enough balance to refund"
    },
    {
      "code": 6018,
      "name": "arithmeticOverflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6019,
      "name": "invalidStake",
      "msg": "Stake amount must be greater than zero"
    }
  ],
  "types": [
    {
      "name": "activation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "activationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "deactivationEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          }
        ]
      }
    },
    {
      "name": "arciumSignerAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "bn254g2blsPublicKey",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "array": [
              "u8",
              64
            ]
          }
        ]
      }
    },
    {
      "name": "circuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "local",
            "fields": [
              {
                "defined": {
                  "name": "localCircuitSource"
                }
              }
            ]
          },
          {
            "name": "onChain",
            "fields": [
              {
                "defined": {
                  "name": "onChainCircuitSource"
                }
              }
            ]
          },
          {
            "name": "offChain",
            "fields": [
              {
                "defined": {
                  "name": "offChainCircuitSource"
                }
              }
            ]
          }
        ]
      }
    },
    {
      "name": "claimPayoutV2Output",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "claimPayoutV2OutputStruct0"
              }
            }
          }
        ]
      }
    },
    {
      "name": "claimPayoutV2OutputStruct0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": "bool"
          },
          {
            "name": "field1",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "clockAccount",
      "docs": [
        "An account storing the current network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "startEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "currentEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "startEpochTimestamp",
            "type": {
              "defined": {
                "name": "timestamp"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "cluster",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tdInfo",
            "type": {
              "option": {
                "defined": {
                  "name": "nodeMetadata"
                }
              }
            }
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "clusterSize",
            "type": "u16"
          },
          {
            "name": "activation",
            "type": {
              "defined": {
                "name": "activation"
              }
            }
          },
          {
            "name": "maxCapacity",
            "type": "u64"
          },
          {
            "name": "cuPrice",
            "type": "u64"
          },
          {
            "name": "cuPriceProposals",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          },
          {
            "name": "lastUpdatedEpoch",
            "type": {
              "defined": {
                "name": "epoch"
              }
            }
          },
          {
            "name": "nodes",
            "type": {
              "vec": {
                "defined": {
                  "name": "nodeRef"
                }
              }
            }
          },
          {
            "name": "pendingNodes",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "blsPublicKey",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "bn254g2blsPublicKey"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionAccount",
      "docs": [
        "An account representing a [ComputationDefinition] in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "finalizationAuthority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "cuAmount",
            "type": "u64"
          },
          {
            "name": "definition",
            "type": {
              "defined": {
                "name": "computationDefinitionMeta"
              }
            }
          },
          {
            "name": "circuitSource",
            "type": {
              "defined": {
                "name": "circuitSource"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "computationDefinitionMeta",
      "docs": [
        "A computation definition for execution in a MXE."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "circuitLen",
            "type": "u32"
          },
          {
            "name": "signature",
            "type": {
              "defined": {
                "name": "computationSignature"
              }
            }
          }
        ]
      }
    },
    {
      "name": "computationSignature",
      "docs": [
        "The signature of a computation defined in a [ComputationDefinition]."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "parameters",
            "type": {
              "vec": {
                "defined": {
                  "name": "parameter"
                }
              }
            }
          },
          {
            "name": "outputs",
            "type": {
              "vec": {
                "defined": {
                  "name": "output"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "Global program config — singleton."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority allowed to perform admin ops (pause, set fee, etc.)"
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBps",
            "docs": [
              "Protocol fee in basis points (1 bp = 0.01%). Charged on winning payouts."
            ],
            "type": "u16"
          },
          {
            "name": "feeRecipient",
            "docs": [
              "Where fees accrue."
            ],
            "type": "pubkey"
          },
          {
            "name": "marketCount",
            "docs": [
              "Total markets created (monotonic counter for PDAs)."
            ],
            "type": "u64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for the PDA."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "epoch",
      "docs": [
        "The network epoch"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          "u64"
        ]
      }
    },
    {
      "name": "feePool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "localCircuitSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "mxeKeygen"
          },
          {
            "name": "mxeKeyRecoveryInit"
          },
          {
            "name": "mxeKeyRecoveryFinalize"
          }
        ]
      }
    },
    {
      "name": "mxeAccount",
      "docs": [
        "A MPC Execution Environment."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "cluster",
            "type": {
              "option": "u32"
            }
          },
          {
            "name": "keygenOffset",
            "type": "u64"
          },
          {
            "name": "keyRecoveryInitOffset",
            "type": "u64"
          },
          {
            "name": "mxeProgramId",
            "type": "pubkey"
          },
          {
            "name": "authority",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "utilityPubkeys",
            "type": {
              "defined": {
                "name": "setUnset",
                "generics": [
                  {
                    "kind": "type",
                    "type": {
                      "defined": {
                        "name": "utilityPubkeys"
                      }
                    }
                  }
                ]
              }
            }
          },
          {
            "name": "lutOffsetSlot",
            "type": "u64"
          },
          {
            "name": "computationDefinitions",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "mxeStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "mxeEncryptedStruct",
      "generics": [
        {
          "kind": "const",
          "name": "len",
          "type": "usize"
        }
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "nonce",
            "type": "u128"
          },
          {
            "name": "ciphertexts",
            "type": {
              "array": [
                {
                  "array": [
                    "u8",
                    32
                  ]
                },
                {
                  "generic": "len"
                }
              ]
            }
          }
        ]
      }
    },
    {
      "name": "market",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "id",
            "docs": [
              "Monotonic ID (== Config.market_count at creation)."
            ],
            "type": "u64"
          },
          {
            "name": "creator",
            "docs": [
              "Wallet that created the market and earns the creator fee."
            ],
            "type": "pubkey"
          },
          {
            "name": "resolver",
            "docs": [
              "Who is permitted to call `resolve_market`. Often == creator,",
              "but could be a designated oracle pubkey."
            ],
            "type": "pubkey"
          },
          {
            "name": "question",
            "docs": [
              "The yes/no question."
            ],
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "category",
            "type": "string"
          },
          {
            "name": "closeTs",
            "docs": [
              "Unix timestamp after which no more positions may be submitted."
            ],
            "type": "i64"
          },
          {
            "name": "resolvedTs",
            "docs": [
              "Unix timestamp when the market was actually resolved (0 until resolved)."
            ],
            "type": "i64"
          },
          {
            "name": "status",
            "docs": [
              "Status flag."
            ],
            "type": {
              "defined": {
                "name": "marketStatus"
              }
            }
          },
          {
            "name": "winningOutcome",
            "docs": [
              "After resolution, 0 = NO won, 1 = YES won."
            ],
            "type": "u8"
          },
          {
            "name": "yesPool",
            "docs": [
              "Public reveal: total YES pool (lamports). Set on resolution."
            ],
            "type": "u64"
          },
          {
            "name": "noPool",
            "docs": [
              "Public reveal: total NO pool. Set on resolution."
            ],
            "type": "u64"
          },
          {
            "name": "totalsCiphertext",
            "docs": [
              "Encrypted ciphertext of `MarketTotals` while market is open.",
              "32 bytes is one Arcium ciphertext element; we have 3 fields packed.",
              "Arcium ciphertext layout: 3 elements of 32 bytes each = 96 bytes."
            ],
            "type": {
              "array": [
                "u8",
                96
              ]
            }
          },
          {
            "name": "totalsPubkey",
            "docs": [
              "X25519 public key of the MXE that owns the totals ciphertext."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "totalsNonce",
            "docs": [
              "Nonce used for the totals ciphertext (rotates on every update)."
            ],
            "type": "u128"
          },
          {
            "name": "totalPositions",
            "docs": [
              "Total participants (revealed after each submission, intentionally)."
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump for the Market PDA."
            ],
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "docs": [
              "Bump for the vault PDA holding stakes."
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "marketCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "totalPositions",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "marketCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "closeTs",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketResolutionRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "resolver",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "winningOutcome",
            "type": "u8"
          },
          {
            "name": "yesPool",
            "type": "u64"
          },
          {
            "name": "noPool",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "marketStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "awaitingResolution"
          },
          {
            "name": "resolved"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "mxeStatus",
      "docs": [
        "The status of an MXE."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "active"
          },
          {
            "name": "migration"
          }
        ]
      }
    },
    {
      "name": "nodeMetadata",
      "docs": [
        "location as [ISO 3166-1 alpha-2](https://www.iso.org/iso-3166-country-codes.html) country code"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ip",
            "type": {
              "array": [
                "u8",
                4
              ]
            }
          },
          {
            "name": "peerId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "location",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "nodeRef",
      "docs": [
        "A reference to a node in the cluster.",
        "The offset is to derive the Node Account.",
        "The current_total_rewards is the total rewards the node has received so far in the current",
        "epoch."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "offset",
            "type": "u32"
          },
          {
            "name": "currentTotalRewards",
            "type": "u64"
          },
          {
            "name": "vote",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "offChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "source",
            "type": "string"
          },
          {
            "name": "hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "onChainCircuitSource",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "isCompleted",
            "type": "bool"
          },
          {
            "name": "uploadAuth",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "output",
      "docs": [
        "An output of a computation.",
        "We currently don't support encrypted outputs yet since encrypted values are passed via",
        "data objects."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisX25519Pubkey"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "plaintextPoint"
          },
          {
            "name": "plaintextI8"
          },
          {
            "name": "plaintextI16"
          },
          {
            "name": "plaintextI32"
          },
          {
            "name": "plaintextI64"
          },
          {
            "name": "plaintextI128"
          }
        ]
      }
    },
    {
      "name": "parameter",
      "docs": [
        "A parameter of a computation.",
        "We differentiate between plaintext and encrypted parameters and data objects.",
        "Plaintext parameters are directly provided as their value.",
        "Encrypted parameters are provided as an offchain reference to the data.",
        "Data objects are provided as a reference to the data object account."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "plaintextBool"
          },
          {
            "name": "plaintextU8"
          },
          {
            "name": "plaintextU16"
          },
          {
            "name": "plaintextU32"
          },
          {
            "name": "plaintextU64"
          },
          {
            "name": "plaintextU128"
          },
          {
            "name": "ciphertext"
          },
          {
            "name": "arcisX25519Pubkey"
          },
          {
            "name": "arcisSignature"
          },
          {
            "name": "plaintextFloat"
          },
          {
            "name": "plaintextI8"
          },
          {
            "name": "plaintextI16"
          },
          {
            "name": "plaintextI32"
          },
          {
            "name": "plaintextI64"
          },
          {
            "name": "plaintextI128"
          },
          {
            "name": "plaintextPoint"
          }
        ]
      }
    },
    {
      "name": "payoutClaimed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "ciphertext",
            "docs": [
              "Encrypted UserPosition (outcome + amount), owned by the user's key.",
              "2 ciphertext elements = 64 bytes."
            ],
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "userPubkey",
            "docs": [
              "X25519 public key of the user (recipient of the encrypted output)."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "nonce",
            "docs": [
              "Nonce used for this position's ciphertext."
            ],
            "type": "u128"
          },
          {
            "name": "stakeAmount",
            "docs": [
              "Plaintext stake amount the user actually transferred to the vault.",
              "We need this on-chain to enforce conservation: vault_balance >= sum(stake).",
              "It's NOT private — but it doesn't reveal the *outcome* the user picked,",
              "which is the herd-inducing signal we care about."
            ],
            "type": "u64"
          },
          {
            "name": "claimed",
            "docs": [
              "Has this position been claimed post-resolution?"
            ],
            "type": "bool"
          },
          {
            "name": "createdTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "positionSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "stakeAmount",
            "type": "u64"
          },
          {
            "name": "totalPositions",
            "type": "u32"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "positionWithdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "market",
            "type": "pubkey"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "resolveMarketV2Output",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "resolveMarketV2OutputStruct0"
              }
            }
          }
        ]
      }
    },
    {
      "name": "resolveMarketV2OutputStruct0",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": "u8"
          },
          {
            "name": "field1",
            "type": "u64"
          },
          {
            "name": "field2",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "setUnset",
      "docs": [
        "Utility struct to store a value that needs to be set by a certain number of participants (keys",
        "in our case). Once all participants have set the value, the value is considered set and we only",
        "store it once."
      ],
      "generics": [
        {
          "kind": "type",
          "name": "t"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "set",
            "fields": [
              {
                "generic": "t"
              }
            ]
          },
          {
            "name": "unset",
            "fields": [
              {
                "generic": "t"
              },
              {
                "vec": "bool"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "signedComputationOutputs",
      "generics": [
        {
          "kind": "type",
          "name": "o"
        }
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "success",
            "fields": [
              {
                "generic": "o"
              },
              {
                "array": [
                  "u8",
                  64
                ]
              }
            ]
          },
          {
            "name": "failure"
          },
          {
            "name": "markerForIdlBuildDoNotUseThis",
            "fields": [
              {
                "generic": "o"
              }
            ]
          }
        ]
      }
    },
    {
      "name": "submitPositionV2Output",
      "docs": [
        "The output of the callback instruction. Provided as a struct with ordered fields",
        "as anchor does not support tuples and tuple structs yet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "field0",
            "type": {
              "defined": {
                "name": "mxeEncryptedStruct",
                "generics": [
                  {
                    "kind": "const",
                    "value": "3"
                  }
                ]
              }
            }
          }
        ]
      }
    },
    {
      "name": "timestamp",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "timestamp",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "utilityPubkeys",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "x25519Pubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "ed25519VerifyingKey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "elgamalPubkey",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "pubkeyValidityProof",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};
