import React, { useState, useRef, useEffect } from 'react';
import { View, Button, Text, StyleSheet, TextInput, CheckBox, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from 'react-native';
import * as MdIcons from "react-icons/md";
import * as TiIcons from "react-icons/ti";
import { Tooltip } from 'react-tooltip';
import Markdown from "react-native-markdown-display";




const timer = ms => new Promise(res => setTimeout(res, ms))
let webserverEndPoint = "";
if (process.env.NODE_ENV === 'development') {
    // You are running the app locally in development mode
    console.log('Running in development mode');
    webserverEndPoint = 'http://localhost:80/chat';
} else {
    // You are running the app in production or some other environment
    console.log('Running in production mode');
    webserverEndPoint = 'https://chatbot3-llama-server-cpc2cggya7dsh3fn.westeurope-01.azurewebsites.net/chat';
}





export default function ChatGPT() {

    const [textInput, setTextInput] = useState("");
    const [prevTextInput, setPrevTextInput] = useState("");
    const [isTextInputFocused, setTextInputFocused] = useState(false)
    const [similarity_top_k, setSimilarity_top_k] = useState("10");
    const [expandedSection2, setExpandedSection2] = useState(false);
    const [expandedSection3, setExpandedSection3] = useState(false);
    const [response_mode, setResponse_mode] = useState("tree_summarize");
    const [similarity_cutoff, setSimilarity_cutoff] = useState("0.75");
    const [semanticEvaluation, setSemanticEvaluation] = useState(false);

    const [loading, setLoading] = useState(false);

    const [content, setContent] = useState("");
    const contentRef = useRef("");

    const [tokenCounter, setTokenCounter] = useState(false);
    const [showContext, setShowContext] = useState(false);
    const [detailedResponse, setDetailedResponse] = useState(false);
    const [detailedResponseWithoutLists, setDetailedResponseWithoutLists] = useState(false)
    const [displaySemanticEvaluation, setDisplaySemanticEvaluation] = useState(false)
    const [vectorIndex, setVectorIndex] = useState("helsenorgeartikler");

    const [windowHeight, setWindowHeight] = useState(window.innerHeight);
    const [bottomSectionHeight, setBottomSectionHeight] = useState(100);
    const [promptHeight, setPromptHeight] = useState(80);
    const [promptSectionHeight, setPromptSectionHeight] = useState(100);
    const [topSectionHeight, setTopSectionHeight] = useState(20);
    const [modelName, setModelName] = useState("gpt-4o-mini");

    const [empathiMode, setEmpathiMode] = useState(false);
    const [youngAgeMode, setYoungAgeMode] = useState(false);
    const [chatGPTOnly, setChatGPTOnly] = useState(false);
    const [subQueries, setSubQueries] = useState(false)
    const [showSubQueries, setShowSubQueries] = useState(false)
    const [translateMode, setTranslateMode] = useState(false)
    const empathiModeMsg = '\nYou will respond with empathy ';
    const youngAgeModeMsg = '\nYou will answer in language that young people aged 13 to 19 understand';
    const detailedResponseMsg = '\n- Provide a detailed explanation';
    const detailedResponseWithoutListsMsg = '\n- Provide a detailed explanation without using any lists'
    const answerInNorwegian = '\n- Always answer in norwegian'
    const scrollViewRef = useRef(); // Reference to ScrollView

    //let defaultSystemMessage = `You are a helpful assistant answering in norwegian, you will be provided with a user query.Your task is to answer only the provided context information.If you do not find the answer in the provided context, answer in norwegian: "Beklager, jeg fant ikke svaret i referansetekstene!". Only if the answer is found in the context information, ${empathiMode ? empathiModeMsg : ""}answer with ${responseWordsLength} words ${youngAgeMode ? youngAgeModeMsg : ""}`
    let defaultSystemMessage =
        `You are a helpful assistant, and you will be given a user request.${empathiMode ? empathiModeMsg : ""}${youngAgeMode ? youngAgeModeMsg : ""}` +
        `\nSome rules to follow:` +
        `\n- Always answer the request using the given context information and not prior knowledge` +
//        `\n- If you cannot find the answer in the given context information, reply: "Beklager, jeg kunne ikke finne svaret i den gitte konteksten."` +
        `${detailedResponse ? detailedResponseMsg : ""}` +
        `${detailedResponseWithoutLists ? detailedResponseWithoutListsMsg : ""}.` +
        `${answerInNorwegian}`

    let defaultSystemMessageChatGPTOnly =
        `You are a helpful assistant, and you will be given a user request.${empathiMode ? empathiModeMsg : ""}${youngAgeMode ? youngAgeModeMsg : ""}` +
        `${detailedResponse ? detailedResponseMsg : ""}` +
        `${detailedResponseWithoutLists ? detailedResponseWithoutListsMsg : ""}.`


    const [systemMessage, setSystemMessage] = useState(defaultSystemMessage);

    useEffect(() => {

        const handleResize = () => {
            setWindowHeight(window.innerHeight);
        };


        //setSystemMessage(`You are a helpful assistant answering in norwegian, you will be provided with a user query.Your task is to answer only the provided context information.If you do not find the answer in the provided context, answer in norwegian: "Beklager, jeg fant ikke svaret i referansetekstene!". Only if the answer is found in the context information, ${empathiMode ? empathiModeMsg : ""}answer with ${responseWordsLength} words ${youngAgeMode ? youngAgeModeMsg : ""}`);
        if (chatGPTOnly) {
            setSystemMessage(defaultSystemMessageChatGPTOnly)
        } else {
            setSystemMessage(defaultSystemMessage)
        }

        window.addEventListener('resize', handleResize);

        // Cleanup the event listener when the component unmounts
        return () => window.removeEventListener('resize', handleResize);

    }, [detailedResponse, empathiMode, youngAgeMode, chatGPTOnly,translateMode, defaultSystemMessage, defaultSystemMessageChatGPTOnly], textInput);

    // Handler function for when highlighted text is pressed
    const handleHighlightPress = (highlightedText) => {
        // Define what action to take when the highlighted text is clicked
        handleSend(highlightedText);
    };

    const updateContent = (chunk) => {
        contentRef.current += chunk;
        setContent(prevContent => prevContent + chunk);

        debounceScroll(); // Smooth out the scroll requests
    };
    const debounceScroll = (() => {
        let timeout;
        return () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100); // Adjust delay time as needed
        };
    })();

    const handleStream = async (response, userMsg, updateContentCallback) => {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let start = true

        let done = false;

        while (!done) {
            let { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {

                // Decode the Uint8Array into a string
                let chunk = decoder.decode(value, { stream: true });
                console.log(chunk)
                if (start) {

                    chunk = "\n---\n::" + userMsg + "::\n\n<<>>\n" + chunk; // ::userMsg:: is a markdown for userMsg treated a rule, <<>> is a markdown for displaying a header for the assistant name 
                    start = false;
                }
                await timer(5);
                //await new Promise(resolve => setTimeout(resolve, 0));

                // Log the processed chunk for debugging
                //console.log("Processed chunk:", chunk);

                // Update the content using the callback
                updateContentCallback(chunk);
            }
        }



    };


    // Custom rule to handle "==highlight==" syntax

    const rules = {
        text: (node, children, parent, styles) => {
            const assistantName = 'HelseSvar:';
            const userName = 'Du spurte:';
            console.log("CONTENT:", node)
            if (node.content.includes("==")) {
                const parts = node.content.split(/(==.*?==)/g);
                return parts.map((part, index) => {
                    if (part.startsWith("==") && part.endsWith("==")) {
                        // Extract highlighted content and return styled Text with TouchableOpacity
                        const highlightedText = part.slice(2, -2);
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleHighlightPress(highlightedText)}
                            >
                                <Text style={markdownStyles.highlight}>
                                    {highlightedText}
                                </Text>
                            </TouchableOpacity>
                        );
                    } else {
                        // Return normal text
                        return (
                            <Text key={index} style={markdownStyles.normalText}>
                                {part}
                            </Text>
                        );
                    }
                });
            }
            if (node.content.includes("::")) {
                const parts = node.content.split(/(::.*?::)/g);
                return parts.map((part, index) => {
                    if (part.startsWith("::") && part.endsWith("::")) {
                        // Extract highlighted content and return styled Text with TouchableOpacity
                        const userMsg = part.slice(2, -2);
                        return [

                            <View
                                key={node.key}
                                style={styles.messageContainer}
                            >
                                <Text style={markdownStyles.roleUser}>{userName}</Text>
                                <View style={styles.messageText}>
                                    <Text style={styles.normalText}>
                                        {userMsg}
                                    </Text>
                                </View>
                            </View>
                        ];
                    } else {
                        // Return normal text
                        return (
                            <Text key={index} style={markdownStyles.normalText}>
                                {part}
                            </Text>
                        );
                    }
                });
            }
            if (node.content.includes("<<")) {
                const parts = node.content.split(/(<<.*?>>)/g);
                return parts.map((part, index) => {
                    if (part.startsWith("<<") && part.endsWith(">>")) {
                        return (
                            <View style={styles.messageContainer}>
                                <Text style={markdownStyles.roleAssistant}>{assistantName}</Text>
                            </View>
                        );
                    } else {
                        // Return normal text
                        return (
                            <Text key={index} style={markdownStyles.normalText}>
                                {part}
                            </Text>
                        );
                    }
                });
            }

            return <Text key={node.key} style={markdownStyles.normalText}>{node.content}</Text>;
        },
        link: (node, children, parent, styles) => {
            const url = node.attributes.href;
            return (
                <Text
                    key={node.key}
                    style={markdownStyles.link}
                    onPress={() => Linking.openURL(url)}
                >
                    {children}
                </Text>
            );
        },
        hr: (node, children, parent, styles) => {
            return (
                <View key={node.key} style={markdownStyles.horizontalRule} />
            );
        },
        table: (node, children, parent, styles) => {
            console.log("TABLE")
            // Add table support
            return (
                <View key={node.key} style={markdownStyles.table}>
                    {children}
                </View>
            );
        },
        table_row: (node, children, parent, styles) => {
            console.log("TABLE_ROV")
            // Handle rows
            return (
                <View key={node.key} style={markdownStyles.tableRow}>
                    {children}
                </View>
            );
        },
        table_cell: (node, children, parent, styles) => {
            console.log("TABLE_CELLS")
            // Handle cells
            return (
                <View key={node.key} style={markdownStyles.tableCell}>
                    <Text style={markdownStyles.tableCellText}>{children}</Text>
                </View>
            );
        },

    };

    function validateInputs(text, type) {
        if (text.length > 0) {
            let numreg = /^[0-9]+$/;
            let floatReg = /^[+-]?\d+(\.\d+)?$/; // Regular expression for float numbers (including integers)

            if ((type === 'similarity_top_k') || (type === 'responseWordsLength')) {
                if (numreg.test(text)) {
                    return true
                } else {
                    alert("please enter numbers only");
                    return false
                }
            }
            if (type === 'similarity_cutoff') {
                const floatValue = parseFloat(text);
                if (floatValue >= 0 && floatValue <= 1) {
                    return true;
                } else {
                    alert("Please enter a float between 0 and 1 only");
                    return false;
                }
            }

        }
        return true;
    }

    const toggleExpandedSection2 = () => {
        setExpandedSection2(!expandedSection2);
    };
    const toggleExpandedSection3 = () => {
        setExpandedSection3(!expandedSection3);
    };



    const clearInput = () => {
        setTextInput("");
        setPromptHeight(80);
    };
    const clearAll = () => {
        clearInput();
        setContent("");
    };
  
    const handleChangeResponse_mode = (event) => {
        setResponse_mode(event.target.value);
    };
    const handleChangeModelName = (event) => {
        setModelName(event.target.value);
    };
    const handleChangeVectorIndex = (event) => {
        setVectorIndex(event.target.value);
    };

    const handleSend = async (text = '') => {
        let userMsg = (text || textInput).replace(/\n/g, "");

        try {
            setLoading(true);
            setExpandedSection2(false);
            setExpandedSection3(false);

            console.log('translateMode', translateMode)

            const responseStream = await fetch(webserverEndPoint, {
                method: 'POST',
                headers: {
                    "Cache-Control": "no-cache",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: systemMessage },
                        { role: "user", content: "Query: " + userMsg }
                    ],
                    modelName,
                    similarity_top_k,
                    response_mode,
                    similarity_cutoff,
                    chatGPTOnly,
                    subQueries,
                    showSubQueries,
                    semanticEvaluation,
                    tokenCounter,
                    vectorIndex,
                    showContext,
                    displaySemanticEvaluation,
                    stream: !semanticEvaluation,
                    translateMode,
                }),
            });

            
            await handleStream(responseStream, userMsg, updateContent);

            setLoading(false);
            clearInput();
            setPrevTextInput(userMsg);

            // Scroll to the end after the response is updated
            setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100); // Adding a slight delay ensures the content is fully rendered
        } catch (error) {
            console.log("error", error);
            setLoading(false);
        }
    };



    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.activityIndicatorContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                </View>
            )}
            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (topSectionHeight !== layout.height) {
                        setTopSectionHeight(layout.height); // assuming you want to store the entire layout 
                    }
                }}
                style={[styles.row, { flexDirection: 'row', }]}>
                <View style={[styles.col1, { flex: 2, }]}></View>
                <View style={[styles.col4, { flex: 4, }]}>
                    <View style={[styles.row, { flex: 4, }]}>
                        <Text style={[styles.title, { textAlign: 'left', padding: 2 }]}>HelseSvar</Text>
                    </View>
                </View>

                <View style={[styles.col4, {
                    flex: 4,
                    paddingTop: 10,
                    paddingRight: 10,
                    paddingBottom: 4,
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                }]}>

                    <select style={styles.selectContainer}
                        value={modelName}
                        onChange={handleChangeModelName}>

                        <option value="gpt-4o-mini">ChatGPT-4o-mini</option>
                        <option value="gpt-o1-mini">ChatGPT-o1-mini</option>
                        <option value="gpt-4o">ChatGPT-4o</option>
                        <option value="gpt-35-turbo">ChatGPT-35</option>
                    </select>

                    <select style={styles.selectContainer}
                        value={vectorIndex}
                        onChange={handleChangeVectorIndex}>
                        <option value="helsenorgeartikler">Helsenorge - artikler</option>
                    </select>
                </View>
                <View style={[styles.col1, { flex: 2 }]}></View>
            </View>

            <View style={[styles.row, { height: windowHeight - topSectionHeight - bottomSectionHeight - promptSectionHeight, }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, {
                    paddingTop: 0,
                    minHeight: Math.min(300, windowHeight - topSectionHeight - bottomSectionHeight - promptSectionHeight), flex: 8
                }]}>

                    <ScrollView ref={scrollViewRef} style={[styles.body, { borderRadius: 4, padding: 5 }]}>
                        <Markdown style={markdownStyles} rules={rules}>
                            {content}
                        </Markdown>
                    </ScrollView>

                     {/* <Markdown
                        style={{

                            table: {
                                borderColor: "white",
                                color: "yellow",
                                borderBlockEndColor: "yellow",
                                borderStartColor: "yellow",
                                borderEndColor: "yellow",
                            },
                        }}>
                        {`
# h1 Heading
## h2 Heading
  ### h3 Heading
  #### h4 Heading
  ##### h5 Heading
  ###### h6 Heading 

  Unordered

  + Create a list by starting a line with 
  + Sub-lists are made by indenting 2 spaces:
    - Marker character change forces new list start:
      * Ac tristique libero volutpat at
      + Facilisis in pretium nisl aliquet
      - Nulla volutpat aliquam velit
  + Very easy!

  Ordered

  1. Lorem ipsum dolor sit amet
  2. Consectetur adipiscing elit
  3. Integer molestie lorem at massa

  Start numbering with offset:

  57. foo
  58. bar



  | Option | Description |
  | ------ | ----------- |
  | data   | path to data files to supply the data that will be passed into templates. |
  | engine | engine to be used for processing templates. Handlebars is the default. |
  | ext    | extension to be used for dest files. |

  Right aligned columns

  | Option | Description |
  | ------:| -----------:|
  | data   | path to data files to supply the data that will be passed into templates. |
  | engine | engine to be used for processing templates. Handlebars is the default. |
  | ext    | extension to be used for dest files. |
`}
                    </Markdown>  
                    <Markdown
                        style={{

                            table: {
                                borderColor: "white",
                                color: "yellow",
                                borderBlockEndColor: "yellow",
                                borderStartColor: "yellow",
                                borderEndColor: "yellow",
                            },
                        }}>
    {`
| Kode   | Beskrivelse |
| ------ | ----------- |
| E89.-  | Endokrine og metabolske forstyrrelser etter kirurgiske og medisinske prosedyrer, ikke klassifisert annet sted |
| G97.-  | Lidelser i nervesystemet etter kirurgiske og medisinske prosedyrer, ikke klassifisert annet sted |
| H59.-  | Forstyrrelser i øyet og øyets omgivelser etter kirurgiske og medisinske prosedyrer, ikke klassifisert annet sted |
| H95.-  | Lidelser i øre (auris) og ørebensknute (processus mastoideus) etter kirurgiske og medisinske prosedyrer, ikke klassifisert annet sted |
| I97.-  | Forstyrrelser i sirkulasjonssystemet etter kirurgiske og medisinske prosedyrer, ikke klassifisert annet sted |`}
                    </Markdown>*/}

                </View>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (promptSectionHeight !== layout.height) {
                        setPromptSectionHeight(layout.height); // assuming you want to store the entire layout 
                    }
                }}
                style={[styles.row, { minHeight: 100 }]}>
                <View style={[styles.col1, { flex: 2 }]}>
                </View>
                <View style={[styles.col2, { flex: 8 }]}>
                    <TextInput
                        // style={[styles.prompt, { height: Math.max(80, height), width: "100%", outlineStyle: 'none', borderColor: isTextInputFocused === true ? '#3699' : '#3699', borderWidth: 1, }]}
                        style={[styles.prompt, { height: Math.max(80, promptHeight), width: "100%", borderColor: isTextInputFocused === true ? '#3699' : '#3699', /*borderWidth: 1,*/ }]}

                        placeholder="Angi spørsmålet her.."
                        spellCheck="false"
                        readOnly={false}
                        multiline
                        rows={5}
                        maxLength={300000}
                        value={textInput}
                        onContentSizeChange={(e) => {
                            const newHeight = e.nativeEvent.contentSize.height;
                            setPromptHeight(newHeight);
                        }}
                        onChangeText={text => setTextInput(text)}
                        onFocus={() => setTextInputFocused(true)}
                        onBlur={() => setTextInputFocused(false)}
                        onKeyPress={({ nativeEvent }) => {
                            if (nativeEvent.key === 'Enter' && !nativeEvent.shiftKey) {
                                handleSend(); // Send the input
                                //textInputRef.current?.blur(); // Remove focus from TextInput to hide the keyboard
                                nativeEvent.preventDefault?.(); // Prevent adding a newline (if possible)
                            }
                        }}
                        onSubmitEditing={() => { setTextInputFocused(false); console.log('onSubmitEditing') }}
                        onEndEditing={() => { setTextInputFocused(false); console.log('onEndEditing') }}
                    />


                    <View style={{
                        flexDirection: 'row',
                        width: window.width,
                        margin: 0,
                        padding: 0,
                        paddingRight: 0,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 0,
                        borderColor: '#025169',
                        borderRadius: 0,
                        backgroundColor: '#ccdce1'
                    }}>
                        <View style={{
                            paddingRight: 10,
                        }}>

                            <button style={{ borderWidth: 2, }}
                                data-tooltip-id="my-tooltip_resend"
                                data-tooltip-content="Send på nytt"
                                onClick={() => { setTextInput(prevTextInput); handleSend(prevTextInput); /* toggleActivityIndicatorVisibility(); */ }}
                            >
                                <TiIcons.TiArrowRepeat />
                                <Tooltip id="my-tooltip_resend" />

                            </button>
                        </View>
                        <View style={{
                            paddingRight: 10,
                        }}>

                            <button style={{ borderWidth: 2, }}
                                data-tooltip-id="my-tooltip_slett"
                                data-tooltip-content="Tøm listen"
                                onClick={() => { clearAll(); }}
                            >
                                <MdIcons.MdOutlineDeleteSweep />
                                <Tooltip id="my-tooltip_slett" />

                            </button>
                        </View>
                        <View>

                            {!loading && (
                                <button style={{ borderWidth: 2 }}
                                    data-tooltip-id="my-tooltip_send"
                                    data-tooltip-content="Send"
                                    onClick={() => { handleSend(); /* toggleActivityIndicatorVisibility(); */ }}
                                >
                                    <MdIcons.MdSend />
                                    <Tooltip id="my-tooltip_send" />

                                </button>
                            )}
                        </View>

                    </View>
                </View>
                <View style={[styles.col1, { flex: 2 }]}>

                </View>
            </View>


            <View
                onLayout={(event) => {
                    const layout = event.nativeEvent.layout;
                    if (bottomSectionHeight !== layout.height) {
                        setBottomSectionHeight(layout.height); // assuming you want to store the entire layout object
                    }
                }}

                style={[styles.row, { backgroundColor: '#ede5f3', }]}>

                <View style={[styles.col1, { flex: 2, }]}>
                </View>
                <View style={[styles.col2, { flex: 8, backgroundColor: '#025169', }]}>



                    <TouchableOpacity onPress={toggleExpandedSection2}>
                        <View style={[styles.row, { backgroundColor: '#025169', }]}>
                            {expandedSection2 && (<MdIcons.MdExpandLess color="white" />)}
                            {!expandedSection2 && (<MdIcons.MdExpandMore color="white" />)}
                            <Text style={[styles.ingress, { textAlign: 'left', color: 'white', fontWeight: 'bold' },]}>Innstillinger</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection2 && (
                        <View style={[styles.col2, { backgroundColor: '#025169', paddingLeft: 30 }]}>
                            <View style={[styles.row, { paddingTop: 8 }]}>

                                <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Instruksjon:</Text>

                                <TextInput
                                    style={[styles.prompt, { width: "100%" }]}
                                    placeholder={systemMessage}
                                    spellCheck="false"
                                    readOnly={false}
                                    multiline
                                    rows={5}
                                    maxLength={1000}
                                    value={systemMessage}
                                    onChangeText={text => setSystemMessage(text)}
                                />
                            </View>
                            <View style={[styles.row, { paddingTop: 2, }]}>
                                <View style={[styles.col4, { flex: 4, backgroundColor: '#025169', alignItems: 'right' }]}>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Bruk SubQueries:</Text>
                                        <CheckBox
                                            value={subQueries}
                                            onValueChange={(newValue) => {
                                                setSubQueries(newValue);
                                                if (newValue) {
                                                    setModelName("gpt-4o-mini"); // Set modelName to "gpt-4o" when subQueries is checked
                                                }
                                            }}
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            color='grey'
                                        />

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis detaljer med SubQueries:</Text>
                                        <CheckBox
                                            value={showSubQueries}
                                            onValueChange={(newValue) => {
                                                setShowSubQueries(newValue);

                                            }}
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Svar i detalj:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={detailedResponse}
                                            onValueChange={(newValue) => {
                                                setDetailedResponse(newValue);
                                                if (newValue) {
                                                    setDetailedResponseWithoutLists(false);
                                                }
                                            }}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Svar i detalj uten punktliste:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={detailedResponseWithoutLists}
                                            onValueChange={(newValue) => {
                                                setDetailedResponseWithoutLists(newValue);
                                                if (newValue) {
                                                    setDetailedResponse(false);
                                                }
                                            }}

                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Nynorsk støtte:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={translateMode}
                                            onValueChange={(newValue) => {
                                                setTranslateMode(newValue);
                                            }}
                                            color='grey'
                                        />
                                    </View>

                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Vis empati:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={empathiMode}
                                            onValueChange={(newValue) => {
                                                setEmpathiMode(newValue);
                                            }}
                                            color='grey'
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Tilpass svaret til 13-19 år:</Text>
                                        <CheckBox
                                            style={[styles.checkbox, { marginLeft: 200 }]}
                                            value={youngAgeMode}
                                            onValueChange={(newValue) => {
                                                setYoungAgeMode(newValue);
                                            }}
                                            color='grey'
                                        />
                                    </View>


                                </View>
                               
                            </View>

                        </View>
                    )}



                    <TouchableOpacity onPress={toggleExpandedSection3}>
                        <View style={[styles.row, { backgroundColor: '#025169', }]}>
                            {expandedSection3 && (<MdIcons.MdExpandLess color="white" />)}
                            {!expandedSection3 && (<MdIcons.MdExpandMore color="white" />)}
                            <Text style={[styles.ingress, { textAlign: 'left', color: 'white', fontWeight: 'bold' },]}>Tuning</Text>
                        </View>
                    </TouchableOpacity>
                    {expandedSection3 && (
                        <View style={[styles.col2, { backgroundColor: '#025169', paddingLeft: 30 }]}>
                            <View style={[styles.row, { paddingTop: 8 }]}>

                                <View style={[styles.col4, { flex: 6, backgroundColor: '#025169' }]}>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>Antall referansetekster for svaret:</Text>
                                        <TextInput
                                            style={[styles.input, { textAlign: 'right', borderRadius: 4, width: 50, paddingLeft: 10 },]}
                                            editable
                                            value={similarity_top_k}
                                            onChangeText={(text) => { if (validateInputs(text, 'similarity_top_k')) { setSimilarity_top_k(text); } }}
                                        />
                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>response_mode:</Text>
                                        <select style={styles.selectContainer0}
                                            value={response_mode}
                                            onChange={handleChangeResponse_mode}>
                                            <option value="refine">refine</option>
                                            <option value="compact">compact</option>
                                            <option value="tree_summarize">tree_summarize</option>
                                            <option value="simple_summarize">simple_summarize</option>
                                            <option value="accumulate">accumulate</option>
                                            <option value="compact_accumulate">compact_accumulate</option>
                                        </select>

                                    </View>
                                    <View style={[styles.row, { paddingTop: 8 }]}>
                                        <Text style={[styles.subtitle, { textAlign: 'left', paddingRight: 20, color: 'white' }]}>similarity_cutoff:</Text>
                                        <TextInput
                                            style={[styles.input, { textAlign: 'right', borderRadius: 4, width: 50 },]}
                                            editable
                                            value={similarity_cutoff}
                                            onChangeText={(text) => { if (validateInputs(text, 'similarity_cutoff')) { setSimilarity_cutoff(text); } }}
                                        />
                                    </View>

                                </View>
                                <View style={[styles.col4, { flex: 2, backgroundColor: '#025169' }]}>



                                </View>
                            </View>
                        </View>
                    )}

                </View>

                <View style={[styles.col1, { flex: 2 }]}>
                </View>
            </View>

        </View>
    );
}






const styles = StyleSheet.create({
    defaultStyles: {
        backgroundColor: 'red',
        padding: 20,
    },
    container: {
        alignItems: 'left',
        backgroundColor: 'red',
    },
    horizontal: {
        flexDirection: 'row',
        justifyContent: 'left',
        padding: 4,
    },

    row: {
        //justifyContent: 'space-between',
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },

    col: {
        flex: 1,
        width: 300,
        padding: 10,
        border: 1,
        textAlign: 'center'
    },
    col1: {
        minWidth: 50,
        maxWidth: 800,
        padding: 5,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#025169',
    },
    col2: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 10,
        border: 1,
        textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        //backgroundColor: '#f7f7f7',
        backgroundColor: '#ccdce1'
    },
    col3: {
        minWidth: 100,
        //maxWidth: 800,
        padding: 3,
        border: 1,
        //textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        backgroundColor: '#f7f7f7',

        //backgroundColor: '#ccdce1'
    },
    col4: {
        minWidth: 50,
        //maxWidth: 800,
        padding: 3.3,
        paddingBottom: 0,

        border: 1,
        //textAlign: 'left',
        //backgroundColor: '#e1efe3',
        //backgroundColor: '#ede5f3',
        //backgroundColor: '#f7f7f7',
        backgroundColor: '#ccdce1'
    },

    title: {
        color: '#02636c',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 5,
    },
    ingress: {
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
    },
    subtitle: {
        color: 'grey',
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        paddingLeft: 10,
    },

    body: {
        backgroundColor: 'white',
        width: '100%',
        margin: 0,
    },
    bot: {
        fontSize: 12,
        fontWeight: 'normal',
        padding: 4,
    },
    prompt: {
        fontSize: 12,
        fontWeight: 'normal',
        //borderWidth: 0.5,
        borderColor: '#3699b6',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
    },
    input: {
        fontSize: 12,
        fontWeight: 'normal',
        textAlign: 'center',
        //borderWidth: 1, // får feltet til å krasje..
        borderColor: 'darkgrey',
        backgroundColor: 'white',
        marginBottom: 10,
        borderRadius: 4,
        padding: 2,
        position: 'absolute',
        marginLeft: 220, // Space between Text and Select
    },

    button: {
        alignItems: 'center',
        backgroundColor: '#DDDDDD',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
        height: 20,
    },
    btnPress: {
        alignItems: 'center',
        backgroundColor: 'red',
        padding: 1,
        borderWidth: 0.5,
        borderColor: 'grey',
        borderRadius: 2,
        justifyContent: 'center',
        width: 50,
    },
    buttonText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: 'blue'
    },
    gifStyle: {
        width: 50,
        height: 25,
    },
    gifExpandStyle: {
        width: 15,
        height: 15,
    },
    separator: {
        height: 1,
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.1)",
        marginVertical: 8, // Optional margin to add spacing around the separator
    },
    checkbox: {
        border: '1px solid white',
        position: 'absolute',
        marginLeft: 240,
    },
    selectContainer0: {
        fontSize: 12,
        position: 'absolute',
        marginLeft: 130, // Space between Text and Select
    },
    selectContainer: {
        marginTop: 3.3,
        fontSize: 12,
        marginLeft: 40, // Space between Text and Select
        width: 'fit-content', // or 'max-content'
    },

    styles: {
        fontSize: 14,
        color: 'blue',
    },

    messageContainer: {
        marginVertical: 5,
        paddingHorizontal: 10,
    },
    userHeader: {
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 5,
    },
    botHeader: {
        fontWeight: 'bold',
        color: '#34C759',
        marginBottom: 5,
    },
    messageText: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    boldText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    normalText: {
        fontSize: 12,
    },
    linkButton: {
        backgroundColor: 'grey',
        paddingVertical: 3,
        paddingHorizontal: 5,
        marginVertical: 2,
        marginRight: 5,
        borderRadius: 10,
        height: 23,
    },
    linkButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        textAlign: 'center',
    },

    link: {
        color: 'black',
        fontSize: 10,
        textAlign: 'center',
        textDecorationLine: 'underline', // Underline for links
        backgroundColor: '#ccdce1',
        paddingVertical: 1,
        paddingHorizontal: 5,
        paddingBottom: 3,
        paddingTop: 0,
        borderRadius: 10,
        marginBottom: 1,
        //lineHeight in paragraph decides the space between the links: 15,
    },
    text: {
        fontSize: 12,
        lineHeight: 18,
        flexWrap: 'wrap',      // Allow text to wrap to new lines
        width: '100%',         // Ensure text uses the container width
        flexShrink: 1,         // Shrink text to fit in the container if necessary
        overflow: 'hidden',    // Ensure text doesn't overflow
        textAlign: 'left',
    },
    bold: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    italic: {
        fontSize: 12,
        fontStyle: 'italic',
    },
    strikethrough: {
        textDecorationLine: 'line-through',
    },
    header1: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    ordered_list: {
        fontSize: 12,
        lineHeight: 14,
        padding: 0,
    },
    unordered_list: {
        fontSize: 12,
        lineHeight: 14,
        padding: 0,
    },
    inline_code: {
        fontSize: 16,
        fontFamily: 'monospace',
        backgroundColor: '#e2e2e2',
        padding: 2,
    },
    blockquote: {
        fontSize: 12,
        fontStyle: 'italic',
        borderLeftWidth: 10,
        borderLeftColor: '#ccc',
        paddingLeft: 8,
        marginVertical: 8,
    },
    horizontal_rule: {
        height: 1,            // Height of the horizontal line
        backgroundColor: '#ccc',  // Color of the horizontal line
        marginVertical: 16,    // Vertical spacing before and after the line
        width: '100%',         // Make sure it spans the entire width
    },
    activityIndicatorContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Optional: adds a semi-transparent background to make the indicator more visible
    },
});

const markdownStyles = {

    normalText: {
        fontSize: 12,
        lineHeight: 18,
        flexWrap: 'wrap',      // Allow text to wrap to new lines
        width: '100%',         // Ensure text uses the container width
        flexShrink: 1,         // Shrink text to fit in the container if necessary
        overflow: 'hidden',    // Ensure text doesn't overflow
        textAlign: 'left',
    },
    heading1: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#ff6600',
        marginBottom: 12,
    },
    heading2: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ff4500',
        marginBottom: 10,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 10,
    },
    link: {
        color: '#3498db',
        textDecorationLine: 'underline',
    },
    listItem: {
        fontSize: 16,
        lineHeight: 24,
        color: '#444',
    },
    inlineCode: {
        backgroundColor: '#f0f0f0',
        fontFamily: 'monospace',
        fontSize: 14,
        padding: 4,
        borderRadius: 4,
    },
    blockquote: {
        borderLeftWidth: 4,
        borderLeftColor: '#d1d1d1',
        backgroundColor: '#f9f9f9',
        paddingLeft: 10,
        marginBottom: 10,
        fontStyle: 'italic',
    },
    strong: {
        fontWeight: 'bold',
        color: '#000',
    },
    emphasis: {
        fontStyle: 'italic',
        color: '#666',
    },
    strikethrough: {
        textDecorationLine: 'line-through',
        color: '#888',
    },
    horizontalRule: {
        height: 1,                // Thickness of the line
        backgroundColor: '#ccc',  // Color of the line
        marginVertical: 16,       // Space above and below the line
        width: '100%',            // Full width of the container
    },
    image: {
        width: '100%',
        height: 200,
        resizeMode: 'contain',
        marginBottom: 10,
    },
    codeBlock: {
        backgroundColor: '#f5f5f5',
        padding: 10,
        fontFamily: 'monospace',
        fontSize: 14,
        borderRadius: 4,
    },
    highlight: {
        backgroundColor: '#ffff99',
        padding: 4,
        borderRadius: 4,
        fontWeight: 'bold',
    },
    table: {
        borderWidth: 1, // Outer border of the table
        borderColor: "black", // Consistent border color
        marginBottom: 16, // Spacing below the table
        borderTopWidth: 1, // Only the top border for the container
        borderBottomWidth: 0, // Remove bottom border to avoid overlap
    },
    tableRow: {
        flexDirection: "row", // Layout cells in a row
        borderBottomWidth: 1, // Add bottom border for rows
        borderColor: "black", // Match the table's border color
    },
    lastTableRow: {
        borderBottomWidth: 0, // Remove the bottom border for the last row
    },
    tableCell: {
        flex: 1, // Flex to distribute cells evenly
        padding: 8, // Padding inside the cell
        borderRightWidth: 1, // Add a right border for cells
        borderColor: "black", // Consistent border color
    },
    lastTableCell: {
        borderRightWidth: 0, // Remove right border for the last cell in a row
    },
    tableCellText: {
        textAlign: "center", // Center-align text
        fontSize: 14, // Adjust font size
    },
    roleUser: {
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#e1efe3',
        borderRadius: 3,
        width: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
    roleAssistant: {
        fontSize: 12,
        fontWeight: 'normal',
        marginBottom: 1,
        marginTop: 1,
        backgroundColor: '#feeedb',
        borderRadius: 3,
        width: 65,
        height: 20,
        textAlign: 'center',
        padding: 2,
    },
};



